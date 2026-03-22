import { PublicFooter } from "@/components/site/PublicFooter";
import { PublicHeader } from "@/components/site/PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-shell">
      <PublicHeader />
      <div className="public-content">{children}</div>
      <PublicFooter />
    </div>
  );
}
