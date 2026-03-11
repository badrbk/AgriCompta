import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const associateSchema = z.object({
  userId: z.string(),
  participationPercentage: z.number().min(0).max(100),
  initialContribution: z.number().min(0).default(0),
  joinDate: z.string().transform(v => new Date(v)).optional(),
  isActive: z.boolean().optional(),
});

router.get('/projects/:projectId/associates', async (req: AuthRequest, res, next) => {
  try {
    const associates = await prisma.associate.findMany({
      where: { projectId: req.params.projectId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      },
      orderBy: { joinDate: 'asc' },
    });
    res.json(associates);
  } catch (err) {
    next(err);
  }
});

const createAssociate = async (projectId: string, body: unknown, res: any, next: any) => {
  try {
    const data = associateSchema.parse(body);

    // Vérifier que le total des participations ne dépasse pas 100%
    const existing = await prisma.associate.aggregate({
      where: { projectId, isActive: true },
      _sum: { participationPercentage: true },
    });

    const total = (existing._sum.participationPercentage || 0) + data.participationPercentage;
    if (total > 100) {
      throw new AppError(`Le total des participations dépasse 100% (actuellement ${existing._sum.participationPercentage || 0}%)`, 400);
    }

    const associate = await prisma.associate.create({
      data: { projectId, ...data },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } }
      },
    });

    res.status(201).json(associate);
  } catch (err) {
    next(err);
  }
};

router.post('/projects/:projectId/associates', (req: AuthRequest, res, next) => {
  createAssociate(req.params.projectId, req.body, res, next);
});

// Route alternative avec projectId dans le body
router.post('/associates', (req: AuthRequest, res, next) => {
  const { projectId, ...rest } = req.body;
  if (!projectId) return next(new AppError('projectId est requis', 400));
  createAssociate(projectId, rest, res, next);
});

router.put('/associates/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = associateSchema.partial().parse(req.body);
    const associate = await prisma.associate.update({
      where: { id: req.params.id },
      data,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    res.json(associate);
  } catch (err) {
    next(err);
  }
});

router.delete('/associates/:id', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN') throw new AppError('Accès refusé', 403);
    await prisma.associate.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Associé désactivé' });
  } catch (err) {
    next(err);
  }
});

export default router;
