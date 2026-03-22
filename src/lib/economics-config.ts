import type { EconomicsConfig } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Values used for recipe & pricing math (no DB row required). */
export type EconomicsConfigValues = Pick<
  EconomicsConfig,
  "defaultLaborRateCentsPerHour" | "monthlyFixedCostsCents" | "estimatedBatchesPerMonth"
>;

export const DEFAULT_ECONOMICS_VALUES: EconomicsConfigValues = {
  defaultLaborRateCentsPerHour: 2000,
  monthlyFixedCostsCents: 500000,
  estimatedBatchesPerMonth: 200,
};

/**
 * Read economics from DB if present; otherwise return built-in defaults.
 * Does not write — safe on standalone MongoDB (no replica set).
 */
export async function loadEconomicsValues(): Promise<{
  row: EconomicsConfig | null;
  values: EconomicsConfigValues;
}> {
  const row = await prisma.economicsConfig.findFirst();
  return {
    row,
    values: row
      ? {
          defaultLaborRateCentsPerHour: row.defaultLaborRateCentsPerHour,
          monthlyFixedCostsCents: row.monthlyFixedCostsCents,
          estimatedBatchesPerMonth: row.estimatedBatchesPerMonth,
        }
      : { ...DEFAULT_ECONOMICS_VALUES },
  };
}

/** Response payload for admin economics UI when row may not exist yet. */
export function economicsConfigApiPayload(row: EconomicsConfig | null) {
  if (row) {
    return { ...row, persisted: true as const };
  }
  return {
    id: null as string | null,
    ...DEFAULT_ECONOMICS_VALUES,
    createdAt: null as Date | null,
    updatedAt: null as Date | null,
    persisted: false as const,
  };
}

export function isReplicaSetRequiredError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2031"
  );
}
