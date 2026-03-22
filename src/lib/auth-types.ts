/** Shared admin session types/constants (safe for Edge — no Node crypto). */

export const COOKIE_NAME = "admin_session";

export interface SessionPayload {
  adminId: string;
  email: string;
  exp: number;
}
