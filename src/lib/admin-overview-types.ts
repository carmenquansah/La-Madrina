/**
 * Response shape for GET /api/admin/insights/overview (data field).
 * Keep in sync with route handler.
 */
export type OverviewComparisonPrevious = {
  revenueCents: number;
  orderCount: number;
  averageOrderValueCents: number;
  expensesCents: number;
  grossProfitCents: number;
  totalOrdersInPeriod: number;
  cancellationRatePct: number;
};

/** Percent change vs previous period; null when previous baseline is zero. */
export type OverviewChangePct = {
  revenueCents: number | null;
  orderCount: number | null;
  averageOrderValueCents: number | null;
  expensesCents: number | null;
  grossProfitCents: number | null;
  totalOrdersInPeriod: number | null;
  cancellationRatePct: number | null;
};

export type OverviewAlert = {
  level: "warning" | "info";
  code: string;
  message: string;
};

export type AdminOverviewData = {
  periodDays: number;
  businessTimeZone: string;
  since: string;
  untilExclusive: string;
  revenueCents: number;
  orderCount: number;
  averageOrderValueCents: number;
  expensesCents: number;
  grossProfitCents: number;
  expensesByCategory: { category: string; amountCents: number }[];
  openOrdersCount: number;
  topProductsByRevenue: { productId: string; name: string; revenueCents: number; quantity: number }[];
  topProductsByQuantity: { productId: string; name: string; revenueCents: number; quantity: number }[];
  /** All orders created in period (any status) */
  totalOrdersInPeriod: number;
  ordersByStatus: { status: string; count: number }[];
  cancelledOrdersInPeriod: number;
  /** % of orders in period that ended cancelled (0–100) */
  cancellationRatePct: number;
  fixedExpensesCents: number;
  variableExpensesCents: number;
  /** Completed-order revenue & count by sales channel (null → Unspecified) */
  revenueByChannel: { channel: string; orderCount: number; revenueCents: number }[];
  /** Completed-order revenue & count by fulfillment type (null → Unspecified) */
  revenueByOrderType: { orderType: string; orderCount: number; revenueCents: number }[];
  /** Completed-order line revenue by product category */
  revenueByCategory: { category: string; revenueCents: number; quantity: number }[];
  orderFunnel: {
    created: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    completionRatePct: number;
    cancelRatePct: number;
  };
  comparison: {
    previous: OverviewComparisonPrevious;
    changePct: OverviewChangePct;
  };
  alerts: OverviewAlert[];
  /** One row per calendar day in the business TZ from period start through today */
  dailyTrend: {
    date: string;
    revenueCents: number;
    completedOrderCount: number;
    expensesCents: number;
  }[];
};
