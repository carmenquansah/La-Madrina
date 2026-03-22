import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { clampInsightsDaysParam } from "@/lib/insights-query";
import { getAdminOverviewData } from "@/lib/insights/load-overview-data";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const days = clampInsightsDaysParam(searchParams.get("days"));
  const data = await getAdminOverviewData(days);
  return NextResponse.json({ ok: true, data });
}
