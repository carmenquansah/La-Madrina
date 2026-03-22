import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { clampInsightsDaysParam } from "@/lib/insights-query";
import { getAdminOverviewData } from "@/lib/insights/load-overview-data";
import { loadPricingSnapshotData } from "@/lib/insights/pricing-snapshot";
import { overviewDataToCsv, pricingDataToCsv } from "@/lib/insights/export-csv";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "overview";
  const days = clampInsightsDaysParam(searchParams.get("days"));

  if (kind === "pricing") {
    const data = await loadPricingSnapshotData(days);
    const body = pricingDataToCsv(data);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="la-madrina-pricing-${days}d.csv"`,
      },
    });
  }

  if (kind === "overview") {
    const data = await getAdminOverviewData(days);
    const body = overviewDataToCsv(data);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="la-madrina-overview-${days}d.csv"`,
      },
    });
  }

  return NextResponse.json({ ok: false, message: "Invalid kind (use overview or pricing)" }, { status: 400 });
}
