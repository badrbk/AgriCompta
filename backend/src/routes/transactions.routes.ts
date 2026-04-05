import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

const transactionSchema = z.object({
  projectId: z.string(),
  accountId: z.string(),
  date: z.string().transform(v => new Date(v)),
  type: z.enum(['CAPITAL_ACQUISITION', 'EXPENSE', 'SALE', 'STOCK_IN', 'STOCK_OUT', 'CAPITAL_CONTRIBUTION', 'DISTRIBUTION']),
  amount: z.number().positive('Le montant doit être positif'),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  description: z.string().min(1, 'La description est requise'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT']).default('CASH'),
  documentReference: z.string().optional(),
  paidByAssociateId: z.string().optional(),
  cashAccountId: z.string().optional(),
});

router.get('/projects/:projectId/transactions', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20', type, startDate, endDate, accountId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { projectId: req.params.projectId };
    if (type) where.type = type;
    if (accountId) where.accountId = accountId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { code: true, name: true, type: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      data: transactions,
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

router.post('/transactions', async (req: AuthRequest, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const { cashAccountId, ...transactionData } = data;

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          ...transactionData,
          createdByUserId: req.user!.userId,
        },
        include: { account: true },
      });

      // Créer le flux de trésorerie si un compte de caisse est spécifié
      if (cashAccountId) {
        const account = await tx.cashAccount.findUnique({ where: { id: cashAccountId } });
        if (account) {
          const isIn = ['SALE', 'CAPITAL_CONTRIBUTION'].includes(data.type);
          const newBalance = isIn ? account.balance + data.amount : account.balance - data.amount;

          await tx.cashAccount.update({
            where: { id: cashAccountId },
            data: { balance: newBalance },
          });

          await tx.cashFlow.create({
            data: {
              transactionId: created.id,
              cashAccountId: cashAccountId,
              date: data.date,
              type: isIn ? 'IN' : 'OUT',
              amount: data.amount,
              balanceAfter: newBalance,
            },
          });
        }
      }

      return created;
    });

    logger.info(`Transaction créée : ${transaction.id} (${transaction.type}) par ${req.user!.email}`);
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

router.get('/transactions/:id', async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        account: true,
        createdBy: { select: { firstName: true, lastName: true } },
        cashFlows: { include: { cashAccount: true } },
      },
    });
    if (!transaction) throw new AppError('Transaction introuvable', 404);
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

router.put('/transactions/:id', async (req: AuthRequest, res, next) => {
  try {
    const parsed = transactionSchema.partial().parse(req.body);
    const { cashAccountId: _cashId, ...updateData } = parsed;
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: updateData,
      include: { account: true },
    });
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

router.delete('/transactions/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Transaction supprimée' });
  } catch (err) {
    next(err);
  }
});

router.post('/transactions/:id/attachment', upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('Aucun fichier fourni', 400);

    const attachmentUrl = `/uploads/${req.file.filename}`;
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { attachmentUrl },
    });

    res.json({ attachmentUrl: transaction.attachmentUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
