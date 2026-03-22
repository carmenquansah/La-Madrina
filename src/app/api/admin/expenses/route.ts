import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";

const createSchema = z.object({
  date: z.string().min(1),
  category: z.string().min(1),
  amountCents: z.number().int().min(0),
  description: z.string().optional().nullable(),
  isFixed: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ ok: true, data: expenses });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }
  const { date, category, amountCents, description, isFixed } = parsed.data;
  const expense = await prisma.expense.create({
    data: {
      date: new Date(date),
      category,
      amountCents,
      description: description || null,
      isFixed: isFixed ?? false,
    },
  });
  await writeAdminAudit({
    adminId: auth.adminId,
    adminEmail: auth.email,
    action: "expense.create",
    resource: "expense",
    resourceId: expense.id,
    details: { category, amountCents },
  });
  return NextResponse.json({ ok: true, data: expense });
}
