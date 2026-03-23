import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminOrder } from "@/lib/admin-order-create";
import { checkShopOrderRateLimit } from "@/lib/shop-order-rate-limit";
import { logRouteError } from "@/lib/safe-server-log";
import { sendOrderEmails } from "@/lib/mailer";
import { prisma } from "@/lib/db";

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  unitPriceCents: z.number().int().min(1),
  specifications: z.string().max(4000).optional().nullable(),
});

const shopOrderSchema = z.object({
  customerName: z.string().min(1).max(200).trim(),
  customerEmail: z.string().email().max(320),
  customerPhone: z.string().min(7).max(50).trim(),
  preferredDate: z.string().max(40).optional().nullable(),
  orderType: z.enum(["pickup", "delivery"]),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(lineSchema).min(1).max(40),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function getPaymentInfo() {
  return {
    network: process.env.PAYMENT_MOMO_NETWORK ?? "MTN",
    momoNumber: process.env.PAYMENT_MOMO_NUMBER ?? "",
    momoName: process.env.PAYMENT_MOMO_NAME ?? "La Madrina Bakery",
    whatsapp: process.env.PAYMENT_WHATSAPP ?? "",
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkShopOrderRateLimit(ip);
  if (!rateCheck.ok) {
    return NextResponse.json(
      { ok: false, message: `Too many requests. Try again in ${rateCheck.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = shopOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Please check your details and try again.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await createAdminOrder({
      ...parsed.data,
      channel: "web",
      status: "pending",
      internalNotes: null,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    const orderRef = `LM-${result.orderId.slice(-8).toUpperCase()}`;
    const payment = getPaymentInfo();

    // Fire emails in the background — don't block the response
    (async () => {
      try {
        const productIds = parsed.data.items.map((i) => i.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        });
        const nameById = new Map(products.map((p) => [p.id, p.name]));
        await sendOrderEmails({
          orderRef,
          customerName: parsed.data.customerName,
          customerEmail: parsed.data.customerEmail,
          customerPhone: parsed.data.customerPhone,
          orderType: parsed.data.orderType,
          preferredDate: parsed.data.preferredDate,
          notes: parsed.data.notes,
          totalCents: parsed.data.items.reduce(
            (s, i) => s + i.quantity * i.unitPriceCents,
            0
          ),
          items: parsed.data.items.map((i) => ({
            name: nameById.get(i.productId) ?? i.productId,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
          })),
          momoNumber: payment.momoNumber,
          momoName: payment.momoName,
          momoNetwork: payment.network,
        });
      } catch (emailErr) {
        logRouteError("sendOrderEmails", emailErr);
      }
    })();

    return NextResponse.json({
      ok: true,
      data: {
        orderId: result.orderId,
        orderRef,
        paymentInfo: payment,
      },
    });
  } catch (e) {
    logRouteError("POST /api/shop/orders", e);
    return NextResponse.json({ ok: false, message: "Could not place order. Please try again." }, { status: 500 });
  }
}
