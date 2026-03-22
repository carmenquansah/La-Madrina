/**
 * Admin API fetch helper: sends cookies and redirects to login on 401.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.assign("/admin/login");
  }
  return res;
}
