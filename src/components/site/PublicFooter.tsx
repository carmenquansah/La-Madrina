import Link from "next/link";

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-brand">
          <span className="brand-wordmark-wrap">
            <img
              src="/images/logo/la%20madrina%20logo%20black.png"
              alt="La Madrina"
              className="brand-wordmark brand-wordmark-footer"
              height={34}
            />
          </span>
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
