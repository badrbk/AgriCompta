import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

const closureSchema = z.object({
  projectId: z.string(),
  seasonName: z.string().min(1, 'Le nom de la saison est requis'),
  closureDate: z.string().transform(v => new Date(v)),
  notes: z.string().optional(),
});

const distributionSchema = z.array(z.object({
  associateId: z.string(),
  distributionMethod: z.enum(['CASH', 'REINVEST', 'MIXED']),
  cashAmount: z.number().min(0).optional(),
  reinvestAmount: z.number().min(0).optional(),
  paymentDate: z.string().transform(v => new Date(v)).optional(),
}));

router.get('/projects/:projectId/closures', async (req, res, next) => {
  try {
    const closures = await prisma.seasonClosure.findMany({
      where: { projectId: req.params.projectId },
      include: {
        distributions: {
          include: {
            associate: {
              include: { user: { select: { firstName: true, lastName: true } } }
            }
          }
        },
      },
      orderBy: { closureDate: 'desc' },
    });
    res.json(closures);
  } catch (err) {
    next(err);
  }
});

router.post('/closures', async (req: AuthRequest, res, next) => {
  try {
    const data = closureSchema.parse(req.body);
    const projectId = data.projectId;

    // Calculer le résultat
    const [revenues, expenses, depreciations] = await Promise.all([
      prisma.transaction.aggregate({
        where: { projectId, account: { type: 'REVENUE' } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { projectId, account: { type: 'EXPENSE' } },
        _sum: { amount: true },
      }),
      prisma.depreciation.aggregate({
        where: { asset: { projectId } },
        _sum: { annualDepreciation: true },
      }),
    ]);

    const totalRevenue = revenues._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const totalDepreciation = depreciations._sum.annualDepreciation || 0;
    const netProfit = totalRevenue - totalExpenses - totalDepreciation;

    const closure = await prisma.seasonClosure.create({
      data: {
        ...data,
        totalRevenue,
        totalExpenses,
        depreciation: totalDepreciation,
        netProfit,
        status: 'DRAFT',
      },
      include: { distributions: true },
    });

    logger.info(`Clôture de saison créée : ${closure.id} (${closure.seasonName})`);
    res.status(201).json(closure);
  } catch (err) {
    next(err);
  }
});

router.get('/closures/:id', async (req, res, next) => {
  try {
    const closure = await prisma.seasonClosure.findUnique({
      where: { id: req.params.id },
      include: {
        distributions: {
          include: {
            associate: {
              include: { user: { select: { firstName: true, lastName: true, email: true } } }
            }
          }
        },
        project: { select: { name: true, currency: true } },
      },
    });
    if (!closure) throw new AppError('Clôture introuvable', 404);
    res.json(closure);
  } catch (err) {
    next(err);
  }
});

router.put('/closures/:id', async (req, res, next) => {
  try {
    const data = closureSchema.partial().parse(req.body);
    const existing = await prisma.seasonClosure.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Clôture introuvable', 404);
    if (existing.status === 'VALIDATED') throw new AppError('Une clôture validée ne peut pas être modifiée', 400);

    const closure = await prisma.seasonClosure.update({
      where: { id: req.params.id },
      data,
    });
    res.json(closure);
  } catch (err) {
    next(err);
  }
});

// Valider la clôture
router.post('/closures/:id/validate', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'ACCOUNTANT') {
      throw new AppError('Seul un administrateur ou comptable peut valider une clôture', 403);
    }

    const closure = await prisma.seasonClosure.findUnique({ where: { id: req.params.id } });
    if (!closure) throw new AppError('Clôture introuvable', 404);
    if (closure.status !== 'DRAFT') throw new AppError('Seule une clôture en brouillon peut être validée', 400);

    // Créer les distributions automatiquement pour chaque associé
    const associates = await prisma.associate.findMany({
      where: { projectId: closure.projectId, isActive: true },
    });

    const validated = await prisma.$transaction(async (tx) => {
      // Créer les distributions
      for (const assoc of associates) {
        const profitShare = (closure.netProfit * assoc.participationPercentage) / 100;
        await tx.profitDistribution.upsert({
          where: { id: `${closure.id}_${assoc.id}` },
          create: {
            closureId: closure.id,
            associateId: assoc.id,
            sharePercentage: assoc.participationPercentage,
            profitShare,
            distributionMethod: 'CASH',
            cashAmount: profitShare,
          },
          update: {},
        });
      }

      return tx.seasonClosure.update({
        where: { id: req.params.id },
        data: { status: 'VALIDATED' },
        include: { distributions: true },
      });
    });

    logger.info(`Clôture validée : ${closure.id}`);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// Distribuer les bénéfices
router.post('/closures/:id/distribute', async (req: AuthRequest, res, next) => {
  try {
    const distributions = distributionSchema.parse(req.body);
    const closure = await prisma.seasonClosure.findUnique({ where: { id: req.params.id } });
    if (!closure) throw new AppError('Clôture introuvable', 404);
    if (closure.status !== 'VALIDATED') throw new AppError('La clôture doit être validée avant distribution', 400);

    const updated = await prisma.$transaction(async (tx) => {
      for (const dist of distributions) {
        await tx.profitDistribution.updateMany({
          where: { closureId: req.params.id, associateId: dist.associateId },
          data: {
            distributionMethod: dist.distributionMethod,
            cashAmount: dist.cashAmount,
            reinvestAmount: dist.reinvestAmount,
            paymentDate: dist.paymentDate,
            paymentStatus: 'PAID',
          },
        });
      }

      return tx.seasonClosure.update({
        where: { id: req.params.id },
        data: { status: 'DISTRIBUTED' },
        include: {
          distributions: {
            include: {
              associate: {
                include: { user: { select: { firstName: true, lastName: true } } }
              }
            }
          }
        },
      });
    });

    logger.info(`Bénéfices distribués pour la clôture : ${closure.id}`);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
