import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const stockSchema = z.object({
  projectId: z.string(),
  accountId: z.string(),
  name: z.string().min(1),
  category: z.enum(['HARVEST', 'LIVESTOCK', 'CONSUMABLE']),
  currentQuantity: z.number().min(0).default(0),
  unit: z.string().min(1),
  unitValue: z.number().min(0).default(0),
  minimumThreshold: z.number().min(0).optional(),
  location: z.string().optional(),
  expiryDate: z.string().transform(v => new Date(v)).optional(),
});

const movementSchema = z.object({
  date: z.string().transform(v => new Date(v)),
  type: z.enum(['IN', 'OUT']),
  source: z.enum(['HARVEST', 'PURCHASE', 'SALE', 'LOSS', 'CONSUMPTION']),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/projects/:projectId/stocks', async (req, res, next) => {
  try {
    const { category } = req.query;
    const where: Record<string, unknown> = { projectId: req.params.projectId };
    if (category) where.category = category;

    const stocks = await prisma.stockItem.findMany({
      where,
      include: {
        account: { select: { code: true, name: true } },
        _count: { select: { movements: true } },
      },
      orderBy: { name: 'asc' },
    });

    const totalValue = stocks.reduce((sum, s) => sum + s.totalValue, 0);
    const lowStock = stocks.filter(s => s.minimumThreshold && s.currentQuantity <= s.minimumThreshold);

    res.json({ stocks, totalValue, lowStock: lowStock.length });
  } catch (err) {
    next(err);
  }
});

router.post('/stocks', async (req, res, next) => {
  try {
    const data = stockSchema.parse(req.body);
    const totalValue = data.currentQuantity * data.unitValue;
    const stock = await prisma.stockItem.create({
      data: { ...data, totalValue },
      include: { account: true },
    });
    res.status(201).json(stock);
  } catch (err) {
    next(err);
  }
});

router.get('/stocks/:id', async (req, res, next) => {
  try {
    const stock = await prisma.stockItem.findUnique({
      where: { id: req.params.id },
      include: {
        account: true,
        movements: { orderBy: { date: 'desc' }, take: 50 },
      },
    });
    if (!stock) throw new AppError('Stock introuvable', 404);
    res.json(stock);
  } catch (err) {
    next(err);
  }
});

router.put('/stocks/:id', async (req, res, next) => {
  try {
    const data = stockSchema.partial().parse(req.body);
    const current = await prisma.stockItem.findUnique({ where: { id: req.params.id } });
    if (!current) throw new AppError('Stock introuvable', 404);

    const qty = data.currentQuantity !== undefined ? data.currentQuantity : current.currentQuantity;
    const uv = data.unitValue !== undefined ? data.unitValue : current.unitValue;

    const stock = await prisma.stockItem.update({
      where: { id: req.params.id },
      data: { ...data, totalValue: qty * uv },
    });
    res.json(stock);
  } catch (err) {
    next(err);
  }
});

// Mouvements de stock avec CUMP
router.post('/stocks/:id/movements', async (req, res, next) => {
  try {
    const data = movementSchema.parse(req.body);
    const stock = await prisma.stockItem.findUnique({ where: { id: req.params.id } });
    if (!stock) throw new AppError('Stock introuvable', 404);

    let newQuantity = stock.currentQuantity;
    let newUnitValue = stock.unitValue;

    if (data.type === 'IN') {
      // Calcul CUMP (Coût Unitaire Moyen Pondéré)
      const inCost = data.unitCost || 0;
      if (stock.currentQuantity + data.quantity > 0) {
        newUnitValue =
          (stock.currentQuantity * stock.unitValue + data.quantity * inCost) /
          (stock.currentQuantity + data.quantity);
      }
      newQuantity += data.quantity;
    } else {
      if (data.quantity > stock.currentQuantity) {
        throw new AppError(`Quantité insuffisante. Stock disponible : ${stock.currentQuantity} ${stock.unit}`, 400);
      }
      newQuantity -= data.quantity;
    }

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { ...data, stockItemId: req.params.id },
      }),
      prisma.stockItem.update({
        where: { id: req.params.id },
        data: {
          currentQuantity: newQuantity,
          unitValue: newUnitValue,
          totalValue: newQuantity * newUnitValue,
        },
      }),
    ]);

    res.status(201).json(movement);
  } catch (err) {
    next(err);
  }
});

router.get('/stocks/:id/movements', async (req, res, next) => {
  try {
    const { limit = '50' } = req.query;
    const movements = await prisma.stockMovement.findMany({
      where: { stockItemId: req.params.id },
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
    });
    res.json(movements);
  } catch (err) {
    next(err);
  }
});

export default router;
