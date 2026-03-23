import Link from "next/link";

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-col public-footer-brand">
          <span className="brand-wordmark-wrap">
            <img
              src="/images/logo/la%20madrina%20logo%20black.png"
              alt="La Madrina"
              className="brand-wordmark brand-wordmark-footer"
              height={36}
            />
          </span>
          <p className="public-footer-tagline">
            Baked before dawn.<br />
            Crafted with purpose.
          </p>
          <p className="public-footer-location">Mitchel Street, Tema · Ghana</p>
          <a
            href="https://wa.me/233546368357"
            target="_blank"
            rel="noopener noreferrer"
            className="public-footer-whatsapp"
          >
            WhatsApp us ↗
          </a>
        </div>

        <div className="public-footer-col">
          <p className="public-footer-col-heading">Menu</p>
          <nav className="public-footer-nav" aria-label="Footer">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/shop">Custom cakes</Link>
            <Link href="/about">About us</Link>
            <Link href="/track">Track order</Link>
          </nav>
        </div>

        <div className="public-footer-col">
          <p className="public-footer-col-heading">Hours</p>
          <ul className="public-footer-hours">
            <li><span>Mon – Fri</span><span>6 am – 6 pm</span></li>
            <li><span>Saturday</span><span>7 am – 4 pm</span></li>
            <li><span>Sunday</span><span>Closed</span></li>
          </ul>
          <p className="public-footer-delivery-note">Delivery via Yango, Uber &amp; Bolt</p>
          <Link href="/admin" className="public-footer-staff">Staff login ↗</Link>
        </div>
      </div>

      <div className="public-footer-bottom">
        <div className="public-footer-socials">
          <a href="https://www.instagram.com/la.madrina____bakery" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
            Instagram
          </a>
          <a href="https://www.tiktok.com/@la.madrina.bakery" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="TikTok">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.97a8.2 8.2 0 0 0 4.78 1.52V7.04a4.85 4.85 0 0 1-1.01-.35Z"/></svg>
            TikTok
          </a>
          <a href="https://www.facebook.com/share/188wmk6wp9/" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            Facebook
          </a>
          <a href="https://x.com/lamadrinabakery" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="X (Twitter)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            X
          </a>
          <a href="https://wa.me/233546368357" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="WhatsApp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            WhatsApp
          </a>
        </div>
        <p className="public-footer-copy">© {year} La Madrina Bakery. All rights reserved.</p>
      </div>
    </footer>
  );
}
