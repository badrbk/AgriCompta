import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const projectSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  startDate: z.string().transform(v => new Date(v)),
  currency: z.string().default('MAD'),
  fiscalYearStart: z.number().int().min(1).max(12).default(1),
});

// Helper : vérifier qu'un projet appartient à l'utilisateur
async function checkProjectAccess(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { associates: { where: { userId } } },
  });

  if (!project) throw new AppError('Projet introuvable', 404);
  if (role !== 'ADMIN' && project.associates.length === 0) {
    throw new AppError('Accès refusé à ce projet', 403);
  }
  return project;
}

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const projects = await prisma.project.findMany({
      where: role === 'ADMIN' ? {} : {
        associates: { some: { userId, isActive: true } }
      },
      include: {
        associates: {
          include: { user: { select: { firstName: true, lastName: true } } }
        },
        _count: { select: { transactions: true, assets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = projectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...data,
        associates: {
          create: {
            userId: req.user!.userId,
            participationPercentage: 100,
            initialContribution: 0,
          }
        }
      },
      include: { associates: true },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const project = await checkProjectAccess(req.params.id, req.user!.userId, req.user!.role);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    await checkProjectAccess(req.params.id, req.user!.userId, req.user!.role);
    const data = projectSchema.partial().parse(req.body);

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
    });

    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN') throw new AppError('Seul un administrateur peut supprimer un projet', 403);
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Projet supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/dashboard', async (req: AuthRequest, res, next) => {
  try {
    await checkProjectAccess(req.params.id, req.user!.userId, req.user!.role);
    const projectId = req.params.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      cashAccounts,
      assets,
      stocks,
      revenueMonth,
      expenseMonth,
      revenueTotal,
      expenseTotal,
      recentTransactions,
    ] = await Promise.all([
      prisma.cashAccount.aggregate({ where: { projectId, isActive: true }, _sum: { balance: true } }),
      prisma.asset.aggregate({ where: { projectId, status: 'ACTIVE' }, _sum: { currentValue: true } }),
      prisma.stockItem.aggregate({ where: { projectId }, _sum: { totalValue: true } }),
      prisma.transaction.aggregate({
        where: { projectId, date: { gte: startOfMonth }, account: { type: 'REVENUE' } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { projectId, date: { gte: startOfMonth }, account: { type: 'EXPENSE' } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { projectId, account: { type: 'REVENUE' } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { projectId, account: { type: 'EXPENSE' } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { projectId },
        take: 10,
        orderBy: { date: 'desc' },
        include: { account: { select: { name: true, code: true } } },
      }),
    ]);

    res.json({
      tresorerie: cashAccounts._sum.balance || 0,
      capitalTotal: assets._sum.currentValue || 0,
      stocksValeur: stocks._sum.totalValue || 0,
      chiffreAffairesMois: revenueMonth._sum.amount || 0,
      chargesMois: expenseMonth._sum.amount || 0,
      chiffreAffairesTotal: revenueTotal._sum.amount || 0,
      chargesTotal: expenseTotal._sum.amount || 0,
      resultatPrevisionnel: (revenueTotal._sum.amount || 0) - (expenseTotal._sum.amount || 0),
      transactionsRecentes: recentTransactions,
    });
  } catch (err) {
    next(err);
  }
});

export { checkProjectAccess };
export default router;
