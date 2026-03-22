/**
 * Avoid logging full error objects / PII in production.
 */
export function logRouteError(context: string, err: unknown): void {
  const isDev = process.env.NODE_ENV === "development";
  const msg = err instanceof Error ? err.message : String(err);
  if (isDev && err instanceof Error && err.stack) {
    console.error(`[${context}]`, msg, err.stack);
  } else {
    console.error(`[${context}]`, msg);
  }
}
