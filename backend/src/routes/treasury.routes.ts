import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const cashAccountSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, 'Le nom est requis'),
  type: z.enum(['CASH', 'BANK', 'MOBILE_MONEY']).default('CASH'),
  currency: z.string().default('MAD'),
  balance: z.number().default(0),
});

const cashFlowSchema = z.object({
  date: z.string().transform(v => new Date(v)),
  type: z.enum(['IN', 'OUT']),
  amount: z.number().positive('Le montant doit être positif'),
  description: z.string().min(1, 'La description est requise'),
});

// ─── Lister les comptes de trésorerie d'un projet ──────────────────────────
router.get('/projects/:projectId/treasury', async (req: AuthRequest, res, next) => {
  try {
    const accounts = await prisma.cashAccount.findMany({
      where: { projectId: req.params.projectId, isActive: true },
      include: {
        flows: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        _count: { select: { flows: true } },
      },
      orderBy: { name: 'asc' },
    });

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    res.json({ accounts, totalBalance });
  } catch (err) {
    next(err);
  }
});

// ─── Créer un compte de trésorerie ─────────────────────────────────────────
router.post('/treasury/accounts', async (req: AuthRequest, res, next) => {
  try {
    const data = cashAccountSchema.parse(req.body);
    const account = await prisma.cashAccount.create({ data });
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

// ─── Modifier un compte de trésorerie ──────────────────────────────────────
router.put('/treasury/accounts/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = cashAccountSchema.partial().omit({ projectId: true }).parse(req.body);
    const account = await prisma.cashAccount.update({
      where: { id: req.params.id },
      data,
    });
    res.json(account);
  } catch (err) {
    next(err);
  }
});

// ─── Désactiver un compte de trésorerie ────────────────────────────────────
router.delete('/treasury/accounts/:id', async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN') throw new AppError('Accès refusé', 403);
    await prisma.cashAccount.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Compte de trésorerie désactivé' });
  } catch (err) {
    next(err);
  }
});

// ─── Lister les mouvements d'un compte ─────────────────────────────────────
router.get('/treasury/accounts/:id/flows', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '30', dateFrom, dateTo } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { cashAccountId: req.params.id };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom as string);
      if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo as string);
    }

    const [flows, total, account] = await Promise.all([
      prisma.cashFlow.findMany({
        where,
        include: {
          transaction: {
            select: { type: true, description: true, documentReference: true },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.cashFlow.count({ where }),
      prisma.cashAccount.findUnique({ where: { id: req.params.id } }),
    ]);

    if (!account) throw new AppError('Compte introuvable', 404);

    res.json({
      account,
      flows,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Ajouter un mouvement manuel ────────────────────────────────────────────
router.post('/treasury/accounts/:id/flows', async (req: AuthRequest, res, next) => {
  try {
    const data = cashFlowSchema.parse(req.body);
    const account = await prisma.cashAccount.findUnique({ where: { id: req.params.id } });
    if (!account) throw new AppError('Compte introuvable', 404);

    const newBalance = data.type === 'IN'
      ? account.balance + data.amount
      : account.balance - data.amount;

    if (newBalance < 0) {
      throw new AppError('Solde insuffisant pour cette opération', 400);
    }

    const [flow] = await prisma.$transaction([
      prisma.cashFlow.create({
        data: {
          cashAccountId: req.params.id,
          date: data.date,
          type: data.type,
          amount: data.amount,
          balanceAfter: newBalance,
        },
      }),
      prisma.cashAccount.update({
        where: { id: req.params.id },
        data: { balance: newBalance },
      }),
    ]);

    res.status(201).json({ flow, newBalance });
  } catch (err) {
    next(err);
  }
});

export default router;
