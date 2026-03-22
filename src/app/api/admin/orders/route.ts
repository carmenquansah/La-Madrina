import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import type { Prisma } from "@prisma/client";

const UNSET = "__unset__";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const channel = searchParams.get("channel") || undefined;
  const orderType = searchParams.get("orderType") || undefined;

  const and: Prisma.OrderWhereInput[] = [];
  if (status) and.push({ status });
  if (channel === UNSET) and.push({ channel: null });
  else if (channel) and.push({ channel });
  if (orderType === UNSET) and.push({ orderType: null });
  else if (orderType) and.push({ orderType });

  const orders = await prisma.order.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json({ ok: true, data: orders });
}
