/**
 * Admin area: login is unprotected; (dashboard)/layout enforces auth for the rest.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
