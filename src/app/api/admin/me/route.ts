import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({
    ok: true,
    data: { adminId: auth.adminId, email: auth.email },
  });
}
