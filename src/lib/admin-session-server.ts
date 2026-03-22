import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export type DashboardAdmin = { email: string; adminId: string };

/**
 * Cookie value (raw, may be URL-encoded). Verifies signature + DB active flag.
 */
export async function getDashboardAdminFromCookie(
  rawCookieValue: string | undefined
): Promise<DashboardAdmin | null> {
  if (!rawCookieValue) return null;
  const token = decodeURIComponent(rawCookieValue);
  const session = verifySession(token);
  if (!session) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, active: true },
  });
  if (!admin || admin.active === false) return null;

  return { adminId: admin.id, email: admin.email };
}
