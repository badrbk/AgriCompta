import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const plotSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  area: z.number().positive(),
  areaUnit: z.enum(['HA', 'M2']).default('HA'),
  location: z.string().optional(),
  soilType: z.string().optional(),
  irrigationType: z.enum(['DRIP', 'SPRINKLER', 'FLOOD', 'RAIN_FED']).default('RAIN_FED'),
});

const cropSchema = z.object({
  projectId: z.string(),
  plotId: z.string(),
  cropType: z.string().min(1, 'Le type de culture est requis'),
  variety: z.string().optional(),
  plantingDate: z.string().transform(v => new Date(v)),
  expectedHarvestDate: z.string().transform(v => new Date(v)).optional(),
  areaPlanted: z.number().positive(),
  status: z.enum(['PLANNED', 'PLANTED', 'GROWING', 'HARVESTED', 'FAILED']).default('PLANNED'),
});

const harvestSchema = z.object({
  date: z.string().transform(v => new Date(v)),
  quantity: z.number().positive(),
  unit: z.enum(['KG', 'TON', 'QUINTAL']).default('KG'),
  qualityGrade: z.enum(['A', 'B', 'C']).default('A'),
  destination: z.enum(['STOCK', 'DIRECT_SALE', 'LOSS']).default('STOCK'),
  notes: z.string().optional(),
});

const cropExpenseSchema = z.object({
  expenseType: z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'IRRIGATION', 'LABOR', 'OTHER']),
  amount: z.number().positive(),
  date: z.string().transform(v => new Date(v)),
  transactionId: z.string().optional(),
});

// Parcelles
router.get('/projects/:projectId/plots', async (req, res, next) => {
  try {
    const plots = await prisma.plot.findMany({
      where: { projectId: req.params.projectId },
      include: {
        crops: {
          where: { status: { notIn: ['HARVESTED', 'FAILED'] } },
          select: { id: true, cropType: true, status: true },
        },
        _count: { select: { crops: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(plots);
  } catch (err) {
    next(err);
  }
});

router.post('/plots', async (req, res, next) => {
  try {
    const data = plotSchema.parse(req.body);
    const plot = await prisma.plot.create({ data });
    res.status(201).json(plot);
  } catch (err) {
    next(err);
  }
});

router.put('/plots/:id', async (req, res, next) => {
  try {
    const data = plotSchema.partial().parse(req.body);
    const plot = await prisma.plot.update({ where: { id: req.params.id }, data });
    res.json(plot);
  } catch (err) {
    next(err);
  }
});

// Cultures
router.get('/projects/:projectId/crops', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where: Record<string, unknown> = { projectId: req.params.projectId };
    if (status) where.status = status;

    const crops = await prisma.crop.findMany({
      where,
      include: {
        plot: { select: { name: true, area: true, areaUnit: true } },
        _count: { select: { harvests: true, expenses: true } },
      },
      orderBy: { plantingDate: 'desc' },
    });
    res.json(crops);
  } catch (err) {
    next(err);
  }
});

router.post('/crops', async (req, res, next) => {
  try {
    const data = cropSchema.parse(req.body);
    const crop = await prisma.crop.create({
      data,
      include: { plot: true },
    });
    res.status(201).json(crop);
  } catch (err) {
    next(err);
  }
});

router.get('/crops/:id', async (req, res, next) => {
  try {
    const crop = await prisma.crop.findUnique({
      where: { id: req.params.id },
      include: {
        plot: true,
        harvests: { orderBy: { date: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
      },
    });
    if (!crop) throw new AppError('Culture introuvable', 404);

    // Calculer le coût total et le rendement
    const totalExpenses = crop.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalHarvest = crop.harvests.reduce((sum, h) => {
      // Convertir tout en kg
      let qty = h.quantity;
      if (h.unit === 'TON') qty *= 1000;
      if (h.unit === 'QUINTAL') qty *= 100;
      return sum + qty;
    }, 0);

    res.json({
      ...crop,
      analytics: {
        totalExpenses,
        totalHarvestKg: totalHarvest,
        costPerKg: totalHarvest > 0 ? totalExpenses / totalHarvest : null,
        yieldPerHa: crop.areaPlanted > 0 ? totalHarvest / crop.areaPlanted : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/crops/:id', async (req, res, next) => {
  try {
    const data = cropSchema.partial().parse(req.body);
    const crop = await prisma.crop.update({
      where: { id: req.params.id },
      data,
      include: { plot: true },
    });
    res.json(crop);
  } catch (err) {
    next(err);
  }
});

// Récoltes
router.post('/crops/:id/harvests', async (req, res, next) => {
  try {
    const data = harvestSchema.parse(req.body);
    const harvest = await prisma.harvest.create({
      data: { ...data, cropId: req.params.id },
    });

    // Mettre à jour le statut de la culture si récolte
    await prisma.crop.update({
      where: { id: req.params.id },
      data: {
        status: 'HARVESTED',
        actualHarvestDate: data.date,
      },
    });

    res.status(201).json(harvest);
  } catch (err) {
    next(err);
  }
});

router.get('/crops/:id/harvests', async (req, res, next) => {
  try {
    const harvests = await prisma.harvest.findMany({
      where: { cropId: req.params.id },
      orderBy: { date: 'desc' },
    });
    res.json(harvests);
  } catch (err) {
    next(err);
  }
});

// Charges de culture
router.post('/crops/:id/expenses', async (req, res, next) => {
  try {
    const data = cropExpenseSchema.parse(req.body);
    const expense = await prisma.cropExpense.create({
      data: { ...data, cropId: req.params.id },
    });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
});

export default router;
