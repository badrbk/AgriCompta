import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
});

const saleSchema = z.object({
  projectId: z.string(),
  customerId: z.string().optional(),
  saleDate: z.string().transform(v => new Date(v)),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID']).default('UNPAID'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT']).default('CASH'),
  paidAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  lines: z.array(z.object({
    stockItemId: z.string().optional(),
    productName: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().positive(),
  })).min(1, 'Au moins une ligne de vente est requise'),
});

router.get('/customers', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId as string;

    const customers = await prisma.customer.findMany({
      where,
      include: { _count: { select: { sales: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

router.post('/customers', async (req, res, next) => {
  try {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:projectId/sales', async (req, res, next) => {
  try {
    const { page = '1', limit = '20', paymentStatus, startDate, endDate } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Record<string, unknown> = { projectId: req.params.projectId };
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) (where.saleDate as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.saleDate as Record<string, Date>).lte = new Date(endDate as string);
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { name: true, type: true } },
          lines: true,
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.sale.count({ where }),
    ]);

    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPaid = sales.reduce((sum, s) => sum + s.paidAmount, 0);

    res.json({
      data: sales,
      pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
      summary: { totalRevenue, totalPaid, totalUnpaid: totalRevenue - totalPaid },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/sales', async (req, res, next) => {
  try {
    const data = saleSchema.parse(req.body);
    const totalAmount = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

    const sale = await prisma.sale.create({
      data: {
        projectId: data.projectId,
        customerId: data.customerId,
        saleDate: data.saleDate,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        totalAmount,
        paidAmount: data.paidAmount,
        notes: data.notes,
        lines: {
          create: data.lines.map(line => ({
            ...line,
            totalPrice: line.quantity * line.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        lines: true,
      },
    });

    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
});

router.get('/sales/:id', async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        lines: { include: { stockItem: { select: { name: true, unit: true } } } },
      },
    });
    if (!sale) throw new AppError('Vente introuvable', 404);
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

router.put('/sales/:id', async (req, res, next) => {
  try {
    const data = saleSchema.partial().parse(req.body);
    const sale = await prisma.sale.update({
      where: { id: req.params.id },
      data: {
        paymentStatus: data.paymentStatus,
        paidAmount: data.paidAmount,
        notes: data.notes,
      },
      include: { customer: true, lines: true },
    });
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

router.delete('/sales/:id', async (req, res, next) => {
  try {
    await prisma.sale.delete({ where: { id: req.params.id } });
    res.json({ message: 'Vente supprimée' });
  } catch (err) {
    next(err);
  }
});

export default router;
