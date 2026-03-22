import Link from "next/link";

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-brand">
          <span className="public-footer-name">La Madrina</span>
          <span className="public-footer-tagline">Artisan bread &amp; pastries</span>
        </div>
        <div className="public-footer-links">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/admin" className="public-footer-admin">
            Staff login
          </Link>
        </div>
        <p className="public-footer-copy">© {year} La Madrina Bakery. All rights reserved.</p>
      </div>
    </footer>
  );
}
