import Link from "next/link";

const TAPE = ["Cupcakes", "Ghana Pies", "Samosas", "Sausage Rolls", "Peppery Gizzards", "Celebration Cakes"];

export default function HomePage() {
  return (
    <main className="oj-root">

      {/* ── 1. VAULT — full dark hero ── */}
      <section className="oj-vault">
        <div className="oj-vault-inner">
          <img
            src="/images/logo/La%20Madrina%20logo%20white.png"
            alt="La Madrina"
            className="oj-vault-logo"
          />
          <h1 className="oj-vault-hl">
            Baked fresh.<br />
            <em>Made with intention.</em>
          </h1>
          <p className="oj-vault-sub">
            Cupcakes, celebration cakes, Ghana pies, samosas, sausage rolls, and gizzards —
            order quick-serve items in minutes, or brief us on a custom cake for a guided quote.
          </p>
          <div className="oj-vault-btns">
            <Link href="/shop" className="btn btn-primary">Order today</Link>
            <Link href="/shop" className="oj-ghost">Start a custom cake</Link>
          </div>
        </div>

        {/* arch wave transition to cream body */}
        <span className="oj-arch-bottom" aria-hidden="true">
          <svg viewBox="0 0 1440 88" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,88 Q720,0 1440,88 L1440,88 L0,88 Z" fill="#fdf8f9" />
          </svg>
        </span>
      </section>

      {/* ── 2. PROOF STRIP ── */}
      <section className="oj-proof">
        <div className="oj-shell oj-proof-row">
          <span>Small-batch daily — texture and freshness protected</span>
          <span className="oj-bull" aria-hidden="true">◆</span>
          <span>Custom cakes — brief-first, guided price range</span>
          <span className="oj-bull" aria-hidden="true">◆</span>
          <span>Owner final sign-off on every bespoke order</span>
        </div>
      </section>

      {/* ── 3. MANIFESTO ── */}
      <section className="oj-manifesto">
        <div className="oj-shell oj-manifesto-grid">
          <blockquote className="oj-manifesto-pull">
            &ldquo;Every bite carries an intention.&rdquo;
          </blockquote>
          <div className="oj-manifesto-body">
            <p>
              From flaky Ghana pies and crispy samosas to celebration cakes built
              around your story — everything at La Madrina is made with the same care.
              We guide custom cake orders through a brief-and-quote process, so you always
              know the price before we accept the order.
            </p>
            <Link href="/shop" className="oj-text-link">Explore the menu →</Link>
          </div>
        </div>
      </section>

      {/* ── 4. PATHWAYS — menu rows, not cards ── */}
      <section className="oj-paths">
        <div className="oj-shell">
          <p className="oj-label">Order pathways</p>
          <ol className="oj-path-list">
            <li className="oj-path-row">
              <span className="oj-path-n">01</span>
              <div className="oj-path-copy">
                <h3>Cupcakes &amp; finger foods</h3>
                <p>Cupcakes, Ghana pies, samosas, sausage rolls, and gizzards. Add to cart, you&apos;re done.</p>
              </div>
              <Link href="/shop" className="oj-path-go">Browse →</Link>
            </li>
            <li className="oj-path-row">
              <span className="oj-path-n">02</span>
              <div className="oj-path-copy">
                <h3>Celebration cakes</h3>
                <p>
                  Share size, finish, and flavor. Receive a guided price range.
                  Owner confirms the final quote before we accept the order.
                </p>
              </div>
              <Link href="/shop" className="oj-path-go">Start a brief →</Link>
            </li>
            <li className="oj-path-row oj-path-row-last">
              <span className="oj-path-n">03</span>
              <div className="oj-path-copy">
                <h3>Wholesale supply</h3>
                <p>Reliable recurring batches for cafes, events, and hospitality partners.</p>
              </div>
              <Link href="/shop" className="oj-path-go">Enquire →</Link>
            </li>
          </ol>
        </div>
      </section>

      {/* ── 5. TAPE — scrolling lineup ── */}
      <div className="oj-tape-wrap" aria-label="Signature lineup">
        <div className="oj-tape-track">
          {[...TAPE, ...TAPE].map((name, i) => (
            <span key={i} className="oj-tape-item">
              {name}
              <span className="oj-tape-gem" aria-hidden="true">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── 6. CLOSING VAULT ── */}
      <section className="oj-close">
        {/* arch wave transition from cream into dark */}
        <span className="oj-arch-top" aria-hidden="true">
          <svg viewBox="0 0 1440 88" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0 Q720,88 1440,0 L1440,88 L0,88 Z" fill="#190d14" />
          </svg>
        </span>

        <div className="oj-close-inner">
          <p className="oj-close-quote">
            &ldquo;Every great cake begins with an honest conversation.&rdquo;
          </p>
          <div className="oj-close-btns">
            <Link href="/shop" className="btn btn-primary">Start ordering</Link>
            <Link href="/admin" className="oj-ghost">Staff dashboard</Link>
          </div>
        </div>
      </section>

    </main>
  );
}
