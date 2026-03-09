import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const assetSchema = z.object({
  projectId: z.string(),
  accountId: z.string(),
  name: z.string().min(1),
  category: z.enum(['LAND', 'BUILDING', 'EQUIPMENT', 'VEHICLE', 'LIVESTOCK', 'INSTALLATION']),
  acquisitionDate: z.string().transform(v => new Date(v)),
  acquisitionValue: z.number().positive(),
  depreciationMethod: z.enum(['LINEAR', 'DECLINING', 'NONE']).default('LINEAR'),
  usefulLifeYears: z.number().int().positive().optional(),
  residualValue: z.number().min(0).optional(),
  currentValue: z.number().min(0),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Calcul d'amortissement
function calculateDepreciation(
  acquisitionValue: number,
  residualValue: number = 0,
  usefulLifeYears: number,
  method: string,
  currentBookValue: number,
  yearNumber: number
): number {
  if (method === 'LINEAR') {
    return (acquisitionValue - residualValue) / usefulLifeYears;
  } else if (method === 'DECLINING') {
    const coefficient = usefulLifeYears <= 3 ? 1.5 : usefulLifeYears <= 5 ? 2 : 2.5;
    const rate = (1 / usefulLifeYears) * coefficient;
    return currentBookValue * rate;
  }
  return 0;
}

router.get('/projects/:projectId/assets', async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where: Record<string, unknown> = { projectId: req.params.projectId };
    if (status) where.status = status;
    if (category) where.category = category;

    const assets = await prisma.asset.findMany({
      where,
      include: {
        account: { select: { code: true, name: true } },
        depreciations: { orderBy: { year: 'asc' } },
      },
      orderBy: { acquisitionDate: 'desc' },
    });
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

router.post('/assets', async (req: AuthRequest, res, next) => {
  try {
    const data = assetSchema.parse(req.body);
    const asset = await prisma.asset.create({
      data: { ...data, status: 'ACTIVE' },
      include: { account: true },
    });
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
});

router.get('/assets/:id', async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        account: true,
        depreciations: { orderBy: { year: 'asc' } },
      },
    });
    if (!asset) throw new AppError('Immobilisation introuvable', 404);
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

router.put('/assets/:id', async (req, res, next) => {
  try {
    const data = assetSchema.partial().parse(req.body);
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data,
      include: { account: true },
    });
    res.json(asset);
  } catch (err) {
    next(err);
  }
});

router.delete('/assets/:id', async (req, res, next) => {
  try {
    await prisma.asset.delete({ where: { id: req.params.id } });
    res.json({ message: 'Immobilisation supprimée' });
  } catch (err) {
    next(err);
  }
});

// Calculer et récupérer les amortissements
router.get('/assets/:id/depreciation', async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { depreciations: { orderBy: { year: 'asc' } } },
    });
    if (!asset) throw new AppError('Immobilisation introuvable', 404);

    if (asset.depreciationMethod === 'NONE' || !asset.usefulLifeYears) {
      return res.json({ asset, depreciations: [], message: 'Pas d\'amortissement applicable' });
    }

    // Générer le tableau d'amortissement théorique
    const startYear = asset.acquisitionDate.getFullYear();
    const table: { year: number; annualDepreciation: number; accumulatedDepreciation: number; bookValue: number }[] = [];
    let bookValue = asset.acquisitionValue;
    let accumulated = 0;

    for (let i = 1; i <= asset.usefulLifeYears; i++) {
      const annual = calculateDepreciation(
        asset.acquisitionValue,
        asset.residualValue || 0,
        asset.usefulLifeYears,
        asset.depreciationMethod,
        bookValue,
        i
      );
      accumulated += annual;
      bookValue = Math.max(asset.acquisitionValue - accumulated, asset.residualValue || 0);

      table.push({
        year: startYear + i - 1,
        annualDepreciation: Math.round(annual * 100) / 100,
        accumulatedDepreciation: Math.round(accumulated * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
      });
    }

    res.json({ asset, depreciations: asset.depreciations, theoreticalTable: table });
  } catch (err) {
    next(err);
  }
});

// Appliquer l'amortissement d'une année
router.post('/assets/:id/depreciation', async (req, res, next) => {
  try {
    const { year } = z.object({ year: z.number().int() }).parse(req.body);
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { depreciations: { orderBy: { year: 'desc' }, take: 1 } },
    });
    if (!asset) throw new AppError('Immobilisation introuvable', 404);
    if (asset.depreciationMethod === 'NONE') throw new AppError('Pas d\'amortissement pour cet actif', 400);

    const lastDepr = asset.depreciations[0];
    const currentBookValue = lastDepr ? lastDepr.bookValue : asset.acquisitionValue;
    const accumulated = lastDepr ? lastDepr.accumulatedDepreciation : 0;

    const annual = calculateDepreciation(
      asset.acquisitionValue,
      asset.residualValue || 0,
      asset.usefulLifeYears || 1,
      asset.depreciationMethod,
      currentBookValue,
      (lastDepr?.year || asset.acquisitionDate.getFullYear()) - asset.acquisitionDate.getFullYear() + 1
    );

    const newAccumulated = accumulated + annual;
    const newBookValue = Math.max(asset.acquisitionValue - newAccumulated, asset.residualValue || 0);

    const depreciation = await prisma.$transaction([
      prisma.depreciation.create({
        data: {
          assetId: asset.id,
          year,
          annualDepreciation: annual,
          accumulatedDepreciation: newAccumulated,
          bookValue: newBookValue,
        },
      }),
      prisma.asset.update({
        where: { id: asset.id },
        data: { currentValue: newBookValue },
      }),
    ]);

    res.status(201).json(depreciation[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
