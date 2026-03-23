import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkTrackRateLimit } from "@/lib/shop-track-rate-limit";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment confirmation",
  confirmed: "Payment confirmed — being prepared",
  completed: "Ready / delivered",
  cancelled: "Cancelled",
};

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkTrackRateLimit(ip);
  if (!rateCheck.ok) {
    return NextResponse.json(
      { ok: false, message: `Too many attempts. Try again in ${rateCheck.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const ref = searchParams.get("ref")?.trim().toUpperCase() ?? "";

  if (!email || !ref) {
    return NextResponse.json(
      { ok: false, message: "Email and order reference are required." },
      { status: 400 }
    );
  }

  // ref is formatted as "LM-XXXXXXXX" — strip the prefix to get the ID suffix
  const idSuffix = ref.startsWith("LM-") ? ref.slice(3).toLowerCase() : ref.toLowerCase();
  if (idSuffix.length !== 8) {
    return NextResponse.json(
      { ok: false, message: "Invalid order reference format. It should look like LM-A1B2C3D4." },
      { status: 400 }
    );
  }

  // Fetch all orders for this email (customers rarely have more than a handful)
  const orders = await prisma.order.findMany({
    where: { customerEmail: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      preferredDate: true,
      orderType: true,
      notes: true,
      items: {
        select: {
          quantity: true,
          unitPriceCents: true,
          specifications: true,
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Match by ID suffix — avoids needing a DB-level "endsWith" on ObjectId
  const order = orders.find((o) => o.id.toLowerCase().endsWith(idSuffix));

  // Return the same generic message whether email or ref is wrong (prevents enumeration)
  if (!order) {
    return NextResponse.json(
      { ok: false, message: "No order found. Check your email address and reference number." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      orderRef: `LM-${order.id.slice(-8).toUpperCase()}`,
      status: order.status,
      statusLabel: STATUS_LABEL[order.status] ?? order.status,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      preferredDate: order.preferredDate,
      orderType: order.orderType,
      notes: order.notes,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        specifications: item.specifications,
      })),
    },
  });
}
