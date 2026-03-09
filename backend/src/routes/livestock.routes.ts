import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const livestockSchema = z.object({
  projectId: z.string(),
  type: z.enum(['BREEDING', 'FATTENING']),
  species: z.string().min(1, 'L\'espèce est requise'),
  breed: z.string().optional(),
  initialCount: z.number().int().positive(),
  currentCount: z.number().int().min(0),
  averageWeight: z.number().positive().optional(),
  unitValue: z.number().positive(),
  acquisitionDate: z.string().transform(v => new Date(v)),
});

const movementSchema = z.object({
  date: z.string().transform(v => new Date(v)),
  type: z.enum(['BIRTH', 'PURCHASE', 'SALE', 'DEATH', 'TRANSFER']),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0).optional(),
  totalValue: z.number().min(0).optional(),
  weight: z.number().positive().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const expenseSchema = z.object({
  date: z.string().transform(v => new Date(v)),
  type: z.enum(['FEED', 'VETERINARY', 'LABOR', 'OTHER']),
  amount: z.number().positive(),
  description: z.string().min(1),
});

router.get('/projects/:projectId/livestock', async (req, res, next) => {
  try {
    const { status, species } = req.query;
    const where: Record<string, unknown> = { projectId: req.params.projectId };
    if (status) where.status = status;
    if (species) where.species = species;

    const livestock = await prisma.livestockGroup.findMany({
      where,
      include: {
        _count: { select: { movements: true, expenses: true } },
      },
      orderBy: { acquisitionDate: 'desc' },
    });
    res.json(livestock);
  } catch (err) {
    next(err);
  }
});

router.post('/livestock', async (req, res, next) => {
  try {
    const data = livestockSchema.parse(req.body);
    const group = await prisma.livestockGroup.create({ data });
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
});

router.get('/livestock/:id', async (req, res, next) => {
  try {
    const group = await prisma.livestockGroup.findUnique({
      where: { id: req.params.id },
      include: {
        movements: { orderBy: { date: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
      },
    });
    if (!group) throw new AppError('Groupe de cheptel introuvable', 404);
    res.json(group);
  } catch (err) {
    next(err);
  }
});

router.put('/livestock/:id', async (req, res, next) => {
  try {
    const data = livestockSchema.partial().parse(req.body);
    const group = await prisma.livestockGroup.update({
      where: { id: req.params.id },
      data,
    });
    res.json(group);
  } catch (err) {
    next(err);
  }
});

router.delete('/livestock/:id', async (req, res, next) => {
  try {
    await prisma.livestockGroup.delete({ where: { id: req.params.id } });
    res.json({ message: 'Groupe supprimé' });
  } catch (err) {
    next(err);
  }
});

router.post('/livestock/:id/movements', async (req, res, next) => {
  try {
    const data = movementSchema.parse(req.body);
    const group = await prisma.livestockGroup.findUnique({ where: { id: req.params.id } });
    if (!group) throw new AppError('Groupe introuvable', 404);

    // Mettre à jour le compteur
    let newCount = group.currentCount;
    if (['BIRTH', 'PURCHASE'].includes(data.type)) {
      newCount += data.quantity;
    } else if (['SALE', 'DEATH', 'TRANSFER'].includes(data.type)) {
      newCount -= data.quantity;
      if (newCount < 0) throw new AppError('Quantité insuffisante', 400);
    }

    const [movement] = await prisma.$transaction([
      prisma.livestockMovement.create({
        data: { ...data, livestockGroupId: req.params.id },
      }),
      prisma.livestockGroup.update({
        where: { id: req.params.id },
        data: { currentCount: newCount },
      }),
    ]);

    res.status(201).json(movement);
  } catch (err) {
    next(err);
  }
});

router.get('/livestock/:id/movements', async (req, res, next) => {
  try {
    const movements = await prisma.livestockMovement.findMany({
      where: { livestockGroupId: req.params.id },
      orderBy: { date: 'desc' },
    });
    res.json(movements);
  } catch (err) {
    next(err);
  }
});

router.post('/livestock/:id/expenses', async (req, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);
    const expense = await prisma.livestockExpense.create({
      data: { ...data, livestockGroupId: req.params.id },
    });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
});

router.get('/livestock/:id/expenses', async (req, res, next) => {
  try {
    const expenses = await prisma.livestockExpense.findMany({
      where: { livestockGroupId: req.params.id },
      orderBy: { date: 'desc' },
    });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ expenses, total });
  } catch (err) {
    next(err);
  }
});

export default router;
