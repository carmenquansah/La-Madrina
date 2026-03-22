import { prisma } from "@/lib/db";
import { logRouteError } from "@/lib/safe-server-log";

export type AdminAuditInput = {
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
};

/** Best-effort audit row; does not throw (logs on failure). */
export async function writeAdminAudit(input: AdminAuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        adminEmail: input.adminEmail,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        details:
          input.details && Object.keys(input.details).length > 0
            ? JSON.stringify(input.details)
            : null,
      },
    });
  } catch (e) {
    logRouteError("writeAdminAudit", e);
  }
}
