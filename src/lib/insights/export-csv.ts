import type { AdminOverviewData } from "@/lib/admin-overview-types";
import { csvRow } from "@/lib/csv";
import type { PricingSnapshotData } from "@/lib/insights/pricing-snapshot";

export function overviewDataToCsv(data: AdminOverviewData): string {
  const lines: string[] = [];
  const p = data.comparison.previous;
  const c = data.comparison.changePct;

  lines.push("# La Madrina overview export (amounts in pesewas unless noted)");
  lines.push(csvRow(["businessTimeZone", data.businessTimeZone]));
  lines.push(csvRow(["periodDays", data.periodDays]));
  lines.push(csvRow(["sinceUtc", data.since]));
  lines.push(csvRow(["untilExclusiveUtc", data.untilExclusive]));
  lines.push("");

  lines.push("# current_summary");
  lines.push(csvRow(["metric", "value_pesewas", "value_note"]));
  lines.push(csvRow(["revenueCents", data.revenueCents, "completed orders"]));
  lines.push(csvRow(["completedOrderCount", data.orderCount, ""]));
  lines.push(csvRow(["averageOrderValueCents", data.averageOrderValueCents, ""]));
  lines.push(csvRow(["expensesCents", data.expensesCents, ""]));
  lines.push(csvRow(["grossProfitCents", data.grossProfitCents, ""]));
  lines.push(csvRow(["totalOrdersInPeriod", data.totalOrdersInPeriod, "any status"]));
  lines.push(csvRow(["cancellationRatePct", data.cancellationRatePct, "percent"]));
  lines.push(csvRow(["fixedExpensesCents", data.fixedExpensesCents, ""]));
  lines.push(csvRow(["variableExpensesCents", data.variableExpensesCents, ""]));
  lines.push(csvRow(["openOrdersCount", data.openOrdersCount, "pending+confirmed all time"]));
  lines.push("");

  lines.push("# prior_summary_same_metrics");
  lines.push(csvRow(["metric", "value_pesewas_or_pct"]));
  lines.push(csvRow(["revenueCents", p.revenueCents]));
  lines.push(csvRow(["completedOrderCount", p.orderCount]));
  lines.push(csvRow(["averageOrderValueCents", p.averageOrderValueCents]));
  lines.push(csvRow(["expensesCents", p.expensesCents]));
  lines.push(csvRow(["grossProfitCents", p.grossProfitCents]));
  lines.push(csvRow(["totalOrdersInPeriod", p.totalOrdersInPeriod]));
  lines.push(csvRow(["cancellationRatePct", p.cancellationRatePct]));
  lines.push("");

  lines.push("# pct_change_vs_prior_null_if_no_baseline");
  lines.push(
    csvRow([
      "revenuePct",
      c.revenueCents ?? "",
      "orderCountPct",
      c.orderCount ?? "",
      "aovPct",
      c.averageOrderValueCents ?? "",
      "expensesPct",
      c.expensesCents ?? "",
      "profitPct",
      c.grossProfitCents ?? "",
    ])
  );
  lines.push("");

  lines.push("# order_funnel");
  lines.push(
    csvRow([
      "created",
      data.orderFunnel.created,
      "completed",
      data.orderFunnel.completed,
      "cancelled",
      data.orderFunnel.cancelled,
      "inProgress",
      data.orderFunnel.inProgress,
      "completionRatePct",
      data.orderFunnel.completionRatePct,
    ])
  );
  lines.push("");

  lines.push("# orders_by_status");
  lines.push(csvRow(["status", "count"]));
  for (const row of data.ordersByStatus) {
    lines.push(csvRow([row.status, row.count]));
  }
  lines.push("");

  lines.push("# daily_trend");
  lines.push(csvRow(["date", "revenueCents", "completedOrderCount", "expensesCents"]));
  for (const d of data.dailyTrend) {
    lines.push(csvRow([d.date, d.revenueCents, d.completedOrderCount, d.expensesCents]));
  }
  lines.push("");

  lines.push("# expenses_by_category");
  lines.push(csvRow(["category", "amountCents"]));
  for (const e of data.expensesByCategory) {
    lines.push(csvRow([e.category, e.amountCents]));
  }
  lines.push("");

  lines.push("# revenue_by_channel");
  lines.push(csvRow(["channel", "orderCount", "revenueCents"]));
  for (const r of data.revenueByChannel) {
    lines.push(csvRow([r.channel, r.orderCount, r.revenueCents]));
  }
  lines.push("");

  lines.push("# revenue_by_order_type");
  lines.push(csvRow(["orderType", "orderCount", "revenueCents"]));
  for (const r of data.revenueByOrderType) {
    lines.push(csvRow([r.orderType, r.orderCount, r.revenueCents]));
  }
  lines.push("");

  lines.push("# revenue_by_category");
  lines.push(csvRow(["category", "quantity", "revenueCents"]));
  for (const r of data.revenueByCategory) {
    lines.push(csvRow([r.category, r.quantity, r.revenueCents]));
  }
  lines.push("");

  lines.push("# top_products_revenue");
  lines.push(csvRow(["productId", "name", "revenueCents", "quantity"]));
  for (const r of data.topProductsByRevenue) {
    lines.push(csvRow([r.productId, r.name, r.revenueCents, r.quantity]));
  }
  lines.push("");

  lines.push("# alerts");
  lines.push(csvRow(["level", "code", "message"]));
  for (const a of data.alerts) {
    lines.push(csvRow([a.level, a.code, a.message]));
  }

  return lines.join("\n") + "\n";
}

export function pricingDataToCsv(data: PricingSnapshotData): string {
  const lines: string[] = [];
  lines.push("# La Madrina pricing snapshot (pesewas)");
  lines.push(csvRow(["periodDays", data.periodDays]));
  lines.push(csvRow(["targetMarginPct", data.targetMarginPct]));
  lines.push(csvRow(["lowMarginAlertPct", data.lowMarginAlertPct]));
  lines.push("");
  lines.push(
    csvRow([
      "productId",
      "name",
      "category",
      "basePriceCents",
      "estimatedCostCents",
      "effectiveCostCents",
      "costSource",
      "marginCents",
      "marginPct",
      "unitsSold",
      "revenueCents",
      "demandTier",
      "suggestedMinPriceCents",
      "priceAlert",
      "suggestedMinPriceNote",
    ])
  );
  for (const p of data.pricing) {
    lines.push(
      csvRow([
        p.productId,
        p.name,
        p.category,
        p.basePriceCents,
        p.estimatedCostCents ?? "",
        p.effectiveCostCents ?? "",
        p.costSource,
        p.marginCents,
        p.marginPct,
        p.unitsSold,
        p.revenueCents,
        p.demandTier,
        p.suggestedMinPriceCents ?? "",
        p.priceAlert ?? "",
        p.suggestedMinPriceNote,
      ])
    );
  }
  return lines.join("\n") + "\n";
}
