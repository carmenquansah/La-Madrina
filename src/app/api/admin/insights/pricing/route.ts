import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { clampInsightsDaysParam } from "@/lib/insights-query";
import { loadPricingSnapshotData } from "@/lib/insights/pricing-snapshot";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const days = clampInsightsDaysParam(searchParams.get("days"));
  const data = await loadPricingSnapshotData(days);
  return NextResponse.json({ ok: true, data });
}
