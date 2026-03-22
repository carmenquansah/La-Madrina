import Link from "next/link";

export default function HomePage() {
  return (
    <main className="site-main">
      <section className="site-hero-block">
        <div className="site-hero-grid">
          <div className="site-hero-copy">
            <p className="site-eyebrow">Artisan bakery</p>
            <h1 className="site-hero-title">La Madrina</h1>
            <p className="site-hero-lead">
              Small-batch bread and pastries — order online for pickup or delivery when checkout goes live. Until then, browse
              the shop and help us shape the experience.
            </p>
            <div className="site-actions">
              <Link href="/shop" className="btn btn-primary">
                Browse the shop
              </Link>
              <Link href="/admin" className="btn btn-secondary">
                Staff dashboard
              </Link>
            </div>
          </div>
          <div className="site-hero-panel" aria-hidden="true">
            <div className="site-hero-panel-inner">
              <span className="site-hero-quote">“Good bread takes time.”</span>
            </div>
          </div>
        </div>
      </section>

      <section className="site-features" aria-labelledby="site-features-heading">
        <h2 id="site-features-heading" className="site-section-title">
          Why order with us
        </h2>
        <ul className="site-feature-list">
          <li className="site-feature-card">
            <span className="site-feature-icon" aria-hidden>
              ○
            </span>
            <h3 className="site-feature-title">Baked with intention</h3>
            <p className="site-feature-text">Recipes built on real ingredients and honest costing — not factory shortcuts.</p>
          </li>
          <li className="site-feature-card">
            <span className="site-feature-icon" aria-hidden>
              ○
            </span>
            <h3 className="site-feature-title">Your order, your specs</h3>
            <p className="site-feature-text">Notes and preferences at checkout — we’ll expand as the shop grows.</p>
          </li>
          <li className="site-feature-card">
            <span className="site-feature-icon" aria-hidden>
              ○
            </span>
            <h3 className="site-feature-title">Local &amp; growing</h3>
            <p className="site-feature-text">Built for early-stage bakeries: survive the slow months, scale when demand hits.</p>
          </li>
        </ul>
      </section>
    </main>
  );
}
