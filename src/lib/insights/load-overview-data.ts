import { prisma } from "@/lib/db";
import type {
  AdminOverviewData,
  OverviewAlert,
  OverviewChangePct,
  OverviewComparisonPrevious,
} from "@/lib/admin-overview-types";
import {
  businessDateKey,
  currentPeriodRange,
  getBusinessTimeZone,
  iterateBusinessDateKeys,
  previousPeriodRange,
} from "@/lib/business-calendar";

const REVENUE_DOWN_ALERT_PCT = -10;

function getAlertCancelThresholdPct(): number {
  const n = parseInt(process.env.ALERT_CANCEL_RATE_PCT ?? "15", 10);
  return Number.isFinite(n) && n >= 0 ? n : 15;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function buildChangePct(
  curr: OverviewComparisonPrevious,
  prev: OverviewComparisonPrevious
): OverviewChangePct {
  return {
    revenueCents: pctChange(curr.revenueCents, prev.revenueCents),
    orderCount: pctChange(curr.orderCount, prev.orderCount),
    averageOrderValueCents: pctChange(curr.averageOrderValueCents, prev.averageOrderValueCents),
    expensesCents: pctChange(curr.expensesCents, prev.expensesCents),
    grossProfitCents: pctChange(curr.grossProfitCents, prev.grossProfitCents),
    totalOrdersInPeriod: pctChange(curr.totalOrdersInPeriod, prev.totalOrdersInPeriod),
    cancellationRatePct: pctChange(curr.cancellationRatePct, prev.cancellationRatePct),
  };
}

type OrderPick = {
  id: string;
  status: string;
  totalCents: number;
  channel: string | null;
  orderType: string | null;
  createdAt: Date;
};

type ExpensePick = {
  amountCents: number;
  category: string;
  isFixed: boolean;
  date: Date;
};

type PeriodSummary = OverviewComparisonPrevious & {
  completedOrders: OrderPick[];
  statusTally: Record<string, number>;
  cancelledOrdersInPeriod: number;
  fixedExpensesCents: number;
  variableExpensesCents: number;
  expensesByCategory: { category: string; amountCents: number }[];
  expensesCents: number;
};

function summarizeOrdersAndExpenses(allOrders: OrderPick[], expenses: ExpensePick[]): PeriodSummary {
  const completedOrders = allOrders.filter((o) => o.status === "completed");
  const revenueCents = completedOrders.reduce((s, o) => s + o.totalCents, 0);
  const orderCount = completedOrders.length;
  const averageOrderValueCents = orderCount ? Math.round(revenueCents / orderCount) : 0;

  const statusTally: Record<string, number> = {};
  for (const o of allOrders) {
    statusTally[o.status] = (statusTally[o.status] ?? 0) + 1;
  }
  const totalOrdersInPeriod = allOrders.length;
  const cancelledOrdersInPeriod = statusTally["cancelled"] ?? 0;
  const cancellationRatePct =
    totalOrdersInPeriod > 0 ? Math.round((cancelledOrdersInPeriod / totalOrdersInPeriod) * 100) : 0;

  const expensesCents = expenses.reduce((s, e) => s + e.amountCents, 0);
  const grossProfitCents = revenueCents - expensesCents;

  let fixedExpensesCents = 0;
  let variableExpensesCents = 0;
  for (const e of expenses) {
    if (e.isFixed) fixedExpensesCents += e.amountCents;
    else variableExpensesCents += e.amountCents;
  }

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amountCents;
    return acc;
  }, {});
  const expensesByCategory = Object.entries(byCategory)
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    revenueCents,
    orderCount,
    averageOrderValueCents,
    expensesCents,
    grossProfitCents,
    totalOrdersInPeriod,
    cancellationRatePct,
    completedOrders,
    statusTally,
    cancelledOrdersInPeriod,
    fixedExpensesCents,
    variableExpensesCents,
    expensesByCategory,
  };
}

function buildAlerts(
  curr: OverviewComparisonPrevious,
  change: OverviewChangePct,
  grossProfitCents: number,
  revenueByChannel: { channel: string; revenueCents: number }[]
): OverviewAlert[] {
  const alerts: OverviewAlert[] = [];
  const cancelThreshold = getAlertCancelThresholdPct();

  if (curr.cancellationRatePct > cancelThreshold) {
    alerts.push({
      level: "warning",
      code: "HIGH_CANCELLATION",
      message: `Cancellation rate is ${curr.cancellationRatePct}% (threshold ${cancelThreshold}%).`,
    });
  }

  if (change.revenueCents != null && change.revenueCents <= REVENUE_DOWN_ALERT_PCT) {
    alerts.push({
      level: "warning",
      code: "REVENUE_DOWN",
      message: `Revenue is down ${Math.abs(change.revenueCents)}% vs the prior period.`,
    });
  }

  if (grossProfitCents < 0) {
    alerts.push({
      level: "warning",
      code: "NEGATIVE_PROFIT",
      message: "Recorded expenses exceed completed revenue for this period.",
    });
  }

  const totalRev = revenueByChannel.reduce((s, r) => s + r.revenueCents, 0);
  const unspecified = revenueByChannel.find((r) => r.channel === "Unspecified");
  if (totalRev > 0 && unspecified && unspecified.revenueCents / totalRev > 0.5) {
    alerts.push({
      level: "info",
      code: "CHANNEL_UNSPECIFIED",
      message: "Over half of completed revenue has no channel set — update orders for clearer analytics.",
    });
  }

  return alerts;
}

export async function getAdminOverviewData(daysInput: number): Promise<AdminOverviewData> {
  const days = Math.min(365, Math.max(1, daysInput || 30));
  const tz = getBusinessTimeZone();
  const { since, untilExclusive, firstDateKey, lastDateKey } = currentPeriodRange(days);
  const { prevSince, prevUntilExclusive } = previousPeriodRange(since, days, tz);

  const orderSelect = {
    id: true,
    status: true,
    totalCents: true,
    channel: true,
    orderType: true,
    createdAt: true,
  } as const;

  const expenseSelect = {
    amountCents: true,
    category: true,
    isFixed: true,
    date: true,
  } as const;

  const [allOrdersCurrent, expensesCurrent, allOrdersPrev, expensesPrev] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since, lt: untilExclusive } },
      select: orderSelect,
    }),
    prisma.expense.findMany({
      where: { date: { gte: since, lt: untilExclusive } },
      select: expenseSelect,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: prevSince, lt: prevUntilExclusive } },
      select: orderSelect,
    }),
    prisma.expense.findMany({
      where: { date: { gte: prevSince, lt: prevUntilExclusive } },
      select: expenseSelect,
    }),
  ]);

  const cur = summarizeOrdersAndExpenses(allOrdersCurrent, expensesCurrent);
  const prevSummary = summarizeOrdersAndExpenses(allOrdersPrev, expensesPrev);

  const previous: OverviewComparisonPrevious = {
    revenueCents: prevSummary.revenueCents,
    orderCount: prevSummary.orderCount,
    averageOrderValueCents: prevSummary.averageOrderValueCents,
    expensesCents: prevSummary.expensesCents,
    grossProfitCents: prevSummary.grossProfitCents,
    totalOrdersInPeriod: prevSummary.totalOrdersInPeriod,
    cancellationRatePct: prevSummary.cancellationRatePct,
  };

  const currentComparison: OverviewComparisonPrevious = {
    revenueCents: cur.revenueCents,
    orderCount: cur.orderCount,
    averageOrderValueCents: cur.averageOrderValueCents,
    expensesCents: cur.expensesCents,
    grossProfitCents: cur.grossProfitCents,
    totalOrdersInPeriod: cur.totalOrdersInPeriod,
    cancellationRatePct: cur.cancellationRatePct,
  };

  const changePct = buildChangePct(currentComparison, previous);

  const ordersByStatus = Object.entries(cur.statusTally)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const inProgress =
    (cur.statusTally["pending"] ?? 0) + (cur.statusTally["confirmed"] ?? 0);
  const orderFunnel = {
    created: cur.totalOrdersInPeriod,
    completed: cur.orderCount,
    cancelled: cur.cancelledOrdersInPeriod,
    inProgress,
    completionRatePct:
      cur.totalOrdersInPeriod > 0 ? Math.round((cur.orderCount / cur.totalOrdersInPeriod) * 100) : 0,
    cancelRatePct: cur.cancellationRatePct,
  };

  const channelAgg: Record<string, { revenueCents: number; orderCount: number }> = {};
  for (const o of cur.completedOrders) {
    const ch = (o.channel && o.channel.trim()) || "Unspecified";
    if (!channelAgg[ch]) channelAgg[ch] = { revenueCents: 0, orderCount: 0 };
    channelAgg[ch].revenueCents += o.totalCents;
    channelAgg[ch].orderCount += 1;
  }
  const revenueByChannel = Object.entries(channelAgg)
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const typeAgg: Record<string, { revenueCents: number; orderCount: number }> = {};
  for (const o of cur.completedOrders) {
    const t = (o.orderType && o.orderType.trim()) || "Unspecified";
    if (!typeAgg[t]) typeAgg[t] = { revenueCents: 0, orderCount: 0 };
    typeAgg[t].revenueCents += o.totalCents;
    typeAgg[t].orderCount += 1;
  }
  const revenueByOrderType = Object.entries(typeAgg)
    .map(([orderType, v]) => ({ orderType, ...v }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const openOrdersCount = await prisma.order.count({
    where: { status: { in: ["pending", "confirmed"] } },
  });

  const orderIds = cur.completedOrders.map((o) => o.id);
  const items = orderIds.length
    ? await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        include: { product: { select: { id: true, name: true, category: true } } },
      })
    : [];

  const revenueByProduct: Record<string, { name: string; revenueCents: number; quantity: number }> = {};
  const revenueByCategory: Record<string, { revenueCents: number; quantity: number }> = {};

  for (const item of items) {
    const id = item.productId;
    if (!revenueByProduct[id]) {
      revenueByProduct[id] = { name: item.product.name, revenueCents: 0, quantity: 0 };
    }
    const lineRev = item.quantity * item.unitPriceCents;
    revenueByProduct[id].revenueCents += lineRev;
    revenueByProduct[id].quantity += item.quantity;

    const cat = item.product.category || "other";
    if (!revenueByCategory[cat]) revenueByCategory[cat] = { revenueCents: 0, quantity: 0 };
    revenueByCategory[cat].revenueCents += lineRev;
    revenueByCategory[cat].quantity += item.quantity;
  }

  const revenueByCategoryList = Object.entries(revenueByCategory)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const topByRevenue = Object.entries(revenueByProduct)
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);
  const topByQuantity = Object.entries(revenueByProduct)
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const expenseByDay: Record<string, number> = {};
  const revenueByDay: Record<string, { revenueCents: number; completedOrderCount: number }> = {};

  for (const key of iterateBusinessDateKeys(firstDateKey, lastDateKey)) {
    expenseByDay[key] = 0;
    revenueByDay[key] = { revenueCents: 0, completedOrderCount: 0 };
  }

  for (const o of cur.completedOrders) {
    const key = businessDateKey(o.createdAt, tz);
    if (revenueByDay[key]) {
      revenueByDay[key].revenueCents += o.totalCents;
      revenueByDay[key].completedOrderCount += 1;
    }
  }

  for (const e of expensesCurrent) {
    const key = businessDateKey(new Date(e.date), tz);
    if (key in expenseByDay) expenseByDay[key] += e.amountCents;
  }

  const dailyTrend = Array.from(iterateBusinessDateKeys(firstDateKey, lastDateKey)).map((date) => ({
    date,
    revenueCents: revenueByDay[date].revenueCents,
    completedOrderCount: revenueByDay[date].completedOrderCount,
    expensesCents: expenseByDay[date] ?? 0,
  }));

  const alerts = buildAlerts(currentComparison, changePct, cur.grossProfitCents, revenueByChannel);

  return {
    periodDays: days,
    businessTimeZone: tz,
    since: since.toISOString(),
    untilExclusive: untilExclusive.toISOString(),
    revenueCents: cur.revenueCents,
    orderCount: cur.orderCount,
    averageOrderValueCents: cur.averageOrderValueCents,
    expensesCents: cur.expensesCents,
    grossProfitCents: cur.grossProfitCents,
    expensesByCategory: cur.expensesByCategory,
    openOrdersCount,
    topProductsByRevenue: topByRevenue,
    topProductsByQuantity: topByQuantity,
    totalOrdersInPeriod: cur.totalOrdersInPeriod,
    ordersByStatus,
    cancelledOrdersInPeriod: cur.cancelledOrdersInPeriod,
    cancellationRatePct: cur.cancellationRatePct,
    fixedExpensesCents: cur.fixedExpensesCents,
    variableExpensesCents: cur.variableExpensesCents,
    revenueByChannel,
    revenueByOrderType,
    revenueByCategory: revenueByCategoryList,
    orderFunnel,
    comparison: { previous, changePct },
    alerts,
    dailyTrend,
  };
}
