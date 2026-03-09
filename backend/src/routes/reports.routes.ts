import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  asOf: z.string().optional(),
});

// Compte de résultat
router.get('/projects/:projectId/reports/profit-loss', async (req, res, next) => {
  try {
    const parsed = dateRangeSchema.parse(req.query);
    const projectId = req.params.projectId;
    const from = parsed.startDate || parsed.dateFrom;
    const to = parsed.endDate || parsed.dateTo;

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const dateWhere = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [revenueTransactions, expenseTransactions, depreciations] = await Promise.all([
      prisma.transaction.findMany({
        where: { projectId, ...dateWhere, account: { type: 'REVENUE' } },
        include: { account: { select: { code: true, name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.transaction.findMany({
        where: { projectId, ...dateWhere, account: { type: 'EXPENSE' } },
        include: { account: { select: { code: true, name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.depreciation.findMany({
        where: { asset: { projectId } },
        include: { asset: { select: { name: true, category: true } } },
      }),
    ]);

    const totalRevenue = revenueTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const depreciation = depreciations.reduce((sum, d) => sum + d.annualDepreciation, 0);
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit - depreciation;

    // Grouper par compte
    const revenueByAccount = revenueTransactions.reduce((acc, t) => {
      const key = t.account.code;
      acc[key] = acc[key] || { accountCode: t.account.code, accountName: t.account.name, amount: 0 };
      acc[key].amount += t.amount;
      return acc;
    }, {} as Record<string, { accountCode: string; accountName: string; amount: number }>);

    const expenseByAccount = expenseTransactions.reduce((acc, t) => {
      const key = t.account.code;
      acc[key] = acc[key] || { accountCode: t.account.code, accountName: t.account.name, amount: 0 };
      acc[key].amount += t.amount;
      return acc;
    }, {} as Record<string, { accountCode: string; accountName: string; amount: number }>);

    res.json({
      period: { start: from || null, end: to || null },
      revenues: Object.values(revenueByAccount),
      expenses: Object.values(expenseByAccount),
      depreciation,
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit,
    });
  } catch (err) {
    next(err);
  }
});

// Bilan
router.get('/projects/:projectId/reports/balance-sheet', async (req, res, next) => {
  try {
    const parsed = dateRangeSchema.parse(req.query);
    const projectId = req.params.projectId;
    const asOf = parsed.asOf;

    const [assets, stockItems, cashAccounts, associates, revenueAgg, expenseAgg] = await Promise.all([
      prisma.asset.findMany({
        where: { projectId, status: 'ACTIVE' },
        include: { depreciations: { orderBy: { year: 'desc' }, take: 1 } },
      }),
      prisma.stockItem.findMany({ where: { projectId } }),
      prisma.cashAccount.findMany({ where: { projectId, isActive: true } }),
      prisma.associate.findMany({
        where: { projectId, isActive: true },
        select: { initialContribution: true },
      }),
      prisma.transaction.aggregate({ where: { projectId, account: { type: 'REVENUE' } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { projectId, account: { type: 'EXPENSE' } }, _sum: { amount: true } }),
    ]);

    const fixedAssetsDetail = assets.map(a => {
      const lastDep = a.depreciations[0];
      const accumulated = lastDep ? lastDep.accumulatedDepreciation : 0;
      const bookValue = lastDep ? lastDep.bookValue : a.currentValue;
      return {
        name: a.name,
        acquisitionValue: a.acquisitionValue,
        accumulated,
        bookValue,
      };
    });

    const stocksDetail = stockItems.map(s => ({
      name: s.name,
      quantity: s.currentQuantity,
      unit: s.unit,
      unitValue: s.unitValue,
      totalValue: s.totalValue,
    }));

    const cashDetail = cashAccounts.map(c => ({
      name: c.name,
      type: c.type,
      balance: c.balance,
    }));

    const totalFixed = fixedAssetsDetail.reduce((sum, a) => sum + a.bookValue, 0);
    const totalStocks = stocksDetail.reduce((sum, s) => sum + s.totalValue, 0);
    const totalCash = cashDetail.reduce((sum, c) => sum + c.balance, 0);
    const totalAssets = totalFixed + totalStocks + totalCash;

    const capital = associates.reduce((sum, a) => sum + a.initialContribution, 0);
    const revenues = revenueAgg._sum.amount || 0;
    const expenses = expenseAgg._sum.amount || 0;
    const profit = revenues - expenses;
    const totalLiabilities = capital + profit;

    res.json({
      date: asOf || new Date().toISOString().split('T')[0],
      assets: {
        fixedAssets: fixedAssetsDetail,
        stocks: stocksDetail,
        cash: cashDetail,
        totalFixed,
        totalStocks,
        totalCash,
        total: totalAssets,
      },
      liabilities: {
        capital,
        profit,
        total: totalLiabilities,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Flux de trésorerie
router.get('/projects/:projectId/reports/cash-flow', async (req, res, next) => {
  try {
    const parsed = dateRangeSchema.parse(req.query);
    const projectId = req.params.projectId;
    const from = parsed.startDate || parsed.dateFrom;
    const to = parsed.endDate || parsed.dateTo;

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    const dateWhere = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const flows = await prisma.cashFlow.findMany({
      where: { cashAccount: { projectId }, ...dateWhere },
      include: {
        cashAccount: { select: { name: true, type: true } },
        transaction: { select: { description: true, type: true } },
      },
      orderBy: { date: 'asc' },
    });

    const totalIn = flows.filter(f => f.type === 'IN').reduce((sum, f) => sum + f.amount, 0);
    const totalOut = flows.filter(f => f.type === 'OUT').reduce((sum, f) => sum + f.amount, 0);
    const netFlow = totalIn - totalOut;

    // Solde d'ouverture: solde avant la première entrée de la période
    const openingBalance = flows.length > 0
      ? flows[0].balanceAfter - (flows[0].type === 'IN' ? flows[0].amount : -flows[0].amount)
      : 0;
    const closingBalance = flows.length > 0 ? flows[flows.length - 1].balanceAfter : 0;

    // Données mensuelles
    const monthlyMap = flows.reduce((acc, f) => {
      const month = new Date(f.date).toLocaleDateString('fr-MA', { year: 'numeric', month: 'short' });
      if (!acc[month]) acc[month] = { month, in: 0, out: 0, balance: 0 };
      if (f.type === 'IN') acc[month].in += f.amount;
      else acc[month].out += f.amount;
      acc[month].balance = f.balanceAfter;
      return acc;
    }, {} as Record<string, { month: string; in: number; out: number; balance: number }>);

    res.json({
      entries: flows,
      totalIn,
      totalOut,
      netFlow,
      openingBalance,
      closingBalance,
      monthlyData: Object.values(monthlyMap),
    });
  } catch (err) {
    next(err);
  }
});

// Analyse des cultures
router.get('/projects/:projectId/reports/crop-analysis', async (req, res, next) => {
  try {
    const crops = await prisma.crop.findMany({
      where: { projectId: req.params.projectId },
      include: {
        plot: { select: { name: true } },
        harvests: true,
        expenses: true,
      },
    });

    const analysis = crops.map(crop => {
      const totalExpenses = crop.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalHarvestKg = crop.harvests.reduce((sum, h) => {
        let qty = h.quantity;
        if (h.unit === 'TON') qty *= 1000;
        if (h.unit === 'QUINTAL') qty *= 100;
        return sum + qty;
      }, 0);

      const revenue = 0; // Revenue est calculé via les ventes, non directement lié aux cultures
      const margin = revenue - totalExpenses;
      const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

      return {
        cropId: crop.id,
        cropType: crop.cropType,
        variety: crop.variety,
        plotName: crop.plot.name,
        areaPlanted: crop.areaPlanted,
        status: crop.status,
        totalExpenses,
        totalHarvestKg,
        yieldPerHa: crop.areaPlanted > 0 ? totalHarvestKg / crop.areaPlanted : 0,
        costPerKg: totalHarvestKg > 0 ? totalExpenses / totalHarvestKg : 0,
        revenue,
        margin,
        marginRate,
      };
    });

    const totals = {
      totalExpenses: analysis.reduce((sum, c) => sum + c.totalExpenses, 0),
      totalRevenue: analysis.reduce((sum, c) => sum + c.revenue, 0),
      totalMargin: analysis.reduce((sum, c) => sum + c.margin, 0),
      totalHarvestKg: analysis.reduce((sum, c) => sum + c.totalHarvestKg, 0),
    };

    res.json({ crops: analysis, totals });
  } catch (err) {
    next(err);
  }
});

// Analyse du cheptel
router.get('/projects/:projectId/reports/livestock-analysis', async (req, res, next) => {
  try {
    const groups = await prisma.livestockGroup.findMany({
      where: { projectId: req.params.projectId },
      include: {
        movements: true,
        expenses: true,
      },
    });

    const analysis = groups.map(group => {
      const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);
      const salesMovements = group.movements.filter(m => m.type === 'SALE');
      const totalRevenue = salesMovements.reduce((sum, m) => sum + (m.totalValue || 0), 0);
      const currentValue = group.currentCount * group.unitValue;
      const netResult = totalRevenue + currentValue - totalExpenses;
      const roi = totalExpenses > 0 ? (netResult / totalExpenses) * 100 : 0;

      return {
        groupId: group.id,
        species: group.species,
        breed: group.breed,
        type: group.type,
        status: group.status,
        initialCount: group.initialCount,
        currentCount: group.currentCount,
        unitValue: group.unitValue,
        currentValue,
        totalExpenses,
        totalRevenue,
        netResult,
        roi,
      };
    });

    const totals = {
      totalValue: analysis.reduce((sum, g) => sum + g.currentValue, 0),
      totalExpenses: analysis.reduce((sum, g) => sum + g.totalExpenses, 0),
      totalRevenue: analysis.reduce((sum, g) => sum + g.totalRevenue, 0),
      netResult: analysis.reduce((sum, g) => sum + g.netResult, 0),
    };

    res.json({ groups: analysis, totals });
  } catch (err) {
    next(err);
  }
});

// Export
router.post('/projects/:projectId/reports/export', async (req, res, next) => {
  try {
    const { format, reportType } = z.object({
      format: z.enum(['excel', 'pdf']),
      reportType: z.enum(['profit-loss', 'balance-sheet', 'transactions', 'all']),
    }).parse(req.body);

    res.json({
      message: `Export ${format.toUpperCase()} du rapport ${reportType} disponible`,
      downloadUrl: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
