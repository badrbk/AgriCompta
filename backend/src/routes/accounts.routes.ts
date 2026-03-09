import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const accountSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  name: z.string().min(1, 'Le nom est requis'),
  classCode: z.string().min(1),
  type: z.enum(['ASSET', 'STOCK', 'EXPENSE', 'REVENUE']),
  parentAccountId: z.string().optional(),
  isActive: z.boolean().default(true),
});

router.get('/', async (_req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

// Arbre complet du plan comptable (alias /tree et /chart)
router.get('/tree', async (_req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    const buildTree = (parentId: string | null): unknown[] =>
      accounts
        .filter(a => a.parentAccountId === parentId)
        .map(a => ({ ...a, children: buildTree(a.id) }));
    res.json(buildTree(null));
  } catch (err) {
    next(err);
  }
});

router.get('/chart', async (_req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    // Construire l'arbre hiérarchique
    const buildTree = (parentId: string | null): unknown[] => {
      return accounts
        .filter(a => a.parentAccountId === parentId)
        .map(a => ({
          ...a,
          children: buildTree(a.id),
        }));
    };

    res.json(buildTree(null));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const data = accountSchema.parse(req.body);
    const account = await prisma.account.create({ data });
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const data = accountSchema.partial().parse(req.body);
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data,
    });
    res.json(account);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const used = await prisma.transaction.count({ where: { accountId: req.params.id } });
    if (used > 0) throw new AppError('Ce compte est utilisé dans des transactions et ne peut pas être supprimé', 400);

    await prisma.account.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Compte désactivé' });
  } catch (err) {
    next(err);
  }
});

export default router;
