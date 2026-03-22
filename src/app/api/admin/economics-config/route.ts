import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { writeAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";
import {
  DEFAULT_ECONOMICS_VALUES,
  economicsConfigApiPayload,
  isReplicaSetRequiredError,
  loadEconomicsValues,
} from "@/lib/economics-config";

const patchSchema = z.object({
  defaultLaborRateCentsPerHour: z.number().int().min(0).optional(),
  monthlyFixedCostsCents: z.number().int().min(0).optional(),
  estimatedBatchesPerMonth: z.number().int().min(1).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { row } = await loadEconomicsValues();
  return NextResponse.json({ ok: true, data: economicsConfigApiPayload(row) });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid input" }, { status: 400 });
  }

  const { row } = await loadEconomicsValues();
  const data = { ...DEFAULT_ECONOMICS_VALUES, ...parsed.data };

  try {
    if (row) {
      const cfg = await prisma.economicsConfig.update({
        where: { id: row.id },
        data: parsed.data,
      });
      await writeAdminAudit({
        adminId: auth.adminId,
        adminEmail: auth.email,
        action: "economics.update",
        resource: "economics_config",
        resourceId: cfg.id,
        details: { patch: parsed.data },
      });
      return NextResponse.json({ ok: true, data: economicsConfigApiPayload(cfg) });
    }

    const cfg = await prisma.economicsConfig.create({
      data: {
        defaultLaborRateCentsPerHour: data.defaultLaborRateCentsPerHour,
        monthlyFixedCostsCents: data.monthlyFixedCostsCents,
        estimatedBatchesPerMonth: data.estimatedBatchesPerMonth,
      },
    });
    await writeAdminAudit({
      adminId: auth.adminId,
      adminEmail: auth.email,
      action: "economics.create",
      resource: "economics_config",
      resourceId: cfg.id,
      details: {
        defaultLaborRateCentsPerHour: data.defaultLaborRateCentsPerHour,
        monthlyFixedCostsCents: data.monthlyFixedCostsCents,
        estimatedBatchesPerMonth: data.estimatedBatchesPerMonth,
      },
    });
    return NextResponse.json({ ok: true, data: economicsConfigApiPayload(cfg) });
  } catch (e) {
    if (isReplicaSetRequiredError(e)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "MongoDB must run as a replica set for Prisma writes (local dev: single-node replica set or Atlas). Pricing and recipes still use built-in defaults until economics can be saved.",
        },
        { status: 503 }
      );
    }
    throw e;
  }
}
