"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatGhs } from "@/lib/format-money";
import { pinHeightVariant, resolveShopProductImage } from "@/lib/shop-product-image";

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePriceCents: number | null;
  category: string;
  pricingMode: "catalog" | "quote";
};

type CartLine = {
  quantity: number;
  unitPriceCents: number;
  specifications?: string | null;
};

type QuoteEstimateData = {
  suggestedUnitCents: number;
  minUnitCents: number;
  maxUnitCents: number;
  basisNote: string;
  targetMarginPct: number;
};

function isQuoteProduct(p: Product): boolean {
  return p.pricingMode === "quote";
}

function track(eventType: string, productId?: string) {
  void fetch("/api/shop/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productId ? { eventType, productId } : { eventType }),
  });
}

export function ShopPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [imgBroken, setImgBroken] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const viewedProducts = useRef(new Set<string>());

  const [specText, setSpecText] = useState("");
  const [quoteEstimate, setQuoteEstimate] = useState<QuoteEstimateData | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    track("shop_view");
    fetch("/api/products")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.data)) {
          setProducts(
            j.data.map((row: Product) => ({
              ...row,
              pricingMode: row.pricingMode === "quote" ? "quote" : "catalog",
              basePriceCents: row.basePriceCents ?? null,
            }))
          );
        } else setLoadError("Could not load products");
      })
      .catch(() => setLoadError("Could not load products"));
  }, []);

  useEffect(() => {
    if (!detailProduct) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailProduct]);

  useEffect(() => {
    if (!detailProduct || !isQuoteProduct(detailProduct)) {
      setSpecText("");
      setQuoteEstimate(null);
      setEstimateError("");
      return;
    }
    setSpecText("");
    setQuoteEstimate(null);
    setEstimateError("");
  }, [detailProduct?.id]);

  const cartTotalItems = useMemo(
    () => Object.values(cart).reduce((a, line) => a + line.quantity, 0),
    [cart]
  );

  const cartTotalCents = useMemo(
    () => Object.entries(cart).reduce((sum, [, line]) => sum + line.quantity * line.unitPriceCents, 0),
    [cart]
  );

  function openDetail(p: Product) {
    if (!viewedProducts.current.has(p.id)) {
      viewedProducts.current.add(p.id);
      track("product_view", p.id);
    }
    setDetailProduct(p);
  }

  function addCatalogToCart(p: Product, e?: React.MouseEvent) {
    e?.stopPropagation();
    const unit = p.basePriceCents;
    if (unit == null) return;
    setCart((c) => {
      const ex = c[p.id];
      const nextQty = (ex?.quantity ?? 0) + 1;
      const line: CartLine = {
        quantity: nextQty,
        unitPriceCents: unit,
        specifications: ex?.specifications ?? null,
      };
      return { ...c, [p.id]: line };
    });
    track("add_to_cart", p.id);
  }

  function addQuoteToCartFromModal(p: Product, unitPriceCents: number, specs: string) {
    setCart((c) => {
      const ex = c[p.id];
      const nextQty = (ex?.quantity ?? 0) + 1;
      return {
        ...c,
        [p.id]: {
          quantity: nextQty,
          unitPriceCents,
          specifications: specs,
        },
      };
    });
    track("add_to_cart", p.id);
  }

  async function requestQuoteEstimate() {
    if (!detailProduct || !isQuoteProduct(detailProduct)) return;
    setEstimateLoading(true);
    setEstimateError("");
    try {
      const res = await fetch("/api/shop/quote-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: detailProduct.id,
          description: specText.trim(),
        }),
      });
      const j = await res.json();
      if (!j.ok || !j.data) {
        setQuoteEstimate(null);
        setEstimateError(j.message || "Could not get an estimate");
        return;
      }
      setQuoteEstimate({
        suggestedUnitCents: j.data.suggestedUnitCents,
        minUnitCents: j.data.minUnitCents,
        maxUnitCents: j.data.maxUnitCents,
        basisNote: j.data.basisNote,
        targetMarginPct: j.data.targetMarginPct,
      });
    } catch {
      setEstimateError("Something went wrong. Try again.");
      setQuoteEstimate(null);
    } finally {
      setEstimateLoading(false);
    }
  }

  function beginCheckout() {
    track("begin_checkout");
    window.alert("Checkout is coming soon — thanks for trying the demo!");
  }

  const modalImageSrc =
    detailProduct != null
      ? resolveShopProductImage(detailProduct.category, detailProduct.imageUrl)
      : "";

  const modalNode =
    detailProduct &&
    mounted &&
    createPortal(
      <div
        className="shop-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-modal-title"
        onClick={() => setDetailProduct(null)}
      >
        <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="shop-modal-close"
            aria-label="Close"
            onClick={() => setDetailProduct(null)}
          >
            ×
          </button>
          <div className="shop-modal-image-wrap">
            {!imgBroken[`modal-${detailProduct.id}`] ? (
              <img
                src={modalImageSrc}
                alt={detailProduct.name}
                className="shop-modal-image"
                loading="eager"
                onError={() =>
                  setImgBroken((m) => ({ ...m, [`modal-${detailProduct.id}`]: true }))
                }
              />
            ) : (
              <div className="shop-modal-image shop-pin-fallback" aria-hidden />
            )}
          </div>
          <div className="shop-modal-body">
            <p className="shop-modal-category">{detailProduct.category}</p>
            <h2 id="shop-modal-title" className="shop-modal-title">
              {detailProduct.name}
            </h2>

            {isQuoteProduct(detailProduct) ? (
              <>
                <p className="shop-modal-price" style={{ fontWeight: 600 }}>
                  Price on request
                </p>
                <p className="shop-modal-desc">
                  {detailProduct.description || "Tell us what you’d like — we’ll show a suggested price range from our costs."}
                </p>
                <label style={{ display: "block", marginTop: "0.75rem", fontSize: "0.9rem" }}>
                  Describe your order
                  <textarea
                    value={specText}
                    onChange={(e) => setSpecText(e.target.value)}
                    rows={4}
                    className="shop-quote-textarea"
                    placeholder="Size, flavours, message on the cake, date needed…"
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "0.35rem",
                      padding: "0.5rem 0.65rem",
                      borderRadius: "8px",
                      border: "1px solid rgba(0,0,0,0.15)",
                      fontSize: "0.95rem",
                      resize: "vertical",
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: "0.75rem" }}
                  disabled={estimateLoading || specText.trim().length < 12}
                  onClick={requestQuoteEstimate}
                >
                  {estimateLoading ? "Calculating…" : "Get price estimate"}
                </button>
                {estimateError && (
                  <p className="shop-error" style={{ marginTop: "0.75rem" }} role="alert">
                    {estimateError}
                  </p>
                )}
                {quoteEstimate && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.75rem",
                      background: "rgba(0,0,0,0.04)",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Suggested range (per unit)</p>
                    <p style={{ margin: "0 0 0.35rem" }}>
                      {formatGhs(quoteEstimate.minUnitCents)} – {formatGhs(quoteEstimate.maxUnitCents)}
                    </p>
                    <p style={{ margin: "0 0 0.5rem" }}>
                      <strong>Suggested:</strong> {formatGhs(quoteEstimate.suggestedUnitCents)} (≈{" "}
                      {quoteEstimate.targetMarginPct}% margin target)
                    </p>
                    <p style={{ margin: 0, color: "var(--muted, #555)", fontSize: "0.85rem" }}>
                      {quoteEstimate.basisNote} Final price is confirmed with the bakery.
                    </p>
                  </div>
                )}
                <div className="shop-modal-actions" style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!quoteEstimate}
                    onClick={() => {
                      if (!quoteEstimate) return;
                      addQuoteToCartFromModal(detailProduct, quoteEstimate.suggestedUnitCents, specText.trim());
                    }}
                  >
                    Add to cart (at suggested price)
                  </button>
                  {(cart[detailProduct.id]?.quantity ?? 0) > 0 && (
                    <span className="shop-modal-in-cart">{cart[detailProduct.id]!.quantity} in cart</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="shop-modal-price">{formatGhs(detailProduct.basePriceCents!)}</p>
                <p className="shop-modal-desc">
                  {detailProduct.description || "Delicious details coming soon."}
                </p>
                <div className="shop-modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => addCatalogToCart(detailProduct)}>
                    Add to cart
                  </button>
                  {(cart[detailProduct.id]?.quantity ?? 0) > 0 && (
                    <span className="shop-modal-in-cart">{cart[detailProduct.id]!.quantity} in cart</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <main className="shop-shell">
      <header className="shop-page-header">
        <p className="site-eyebrow">Order online</p>
        <h1 className="shop-hero-title">Menu</h1>
        <p className="shop-lead">
          Scroll the gallery, tap a photo for details, then add to cart — like the apps you already use. Custom items show a
          price after you describe what you want. Checkout opens when we&apos;re ready for real orders.
        </p>
      </header>

      <div className="shop-cart-bar">
        <div className="shop-cart-info">
          <span className="shop-cart-label">Cart</span>
          <span className="shop-cart-count">
            {cartTotalItems} item{cartTotalItems !== 1 ? "s" : ""}
            {cartTotalItems > 0 && <span style={{ marginLeft: "0.5rem", opacity: 0.9 }}>· {formatGhs(cartTotalCents)}</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={beginCheckout}
          disabled={cartTotalItems === 0}
          className="btn btn-primary btn-sm"
        >
          Checkout (demo)
        </button>
      </div>

      {loadError && (
        <p className="shop-error" role="alert">
          {loadError}
        </p>
      )}

      <div className="shop-masonry" role="list">
        {products.map((p, index) => {
          const src = resolveShopProductImage(p.category, p.imageUrl);
          const h = pinHeightVariant(index);
          const quote = isQuoteProduct(p);
          const label = quote
            ? `${p.name}. Price on request. Tap for details.`
            : `${p.name}, ${formatGhs(p.basePriceCents!)}. Tap for details.`;
          return (
            <article key={p.id} className={`shop-pin shop-pin-h${h}`} role="listitem">
              <button type="button" className="shop-pin-hit" onClick={() => openDetail(p)} aria-label={label}>
                <div className="shop-pin-frame">
                  {!imgBroken[p.id] ? (
                    <img
                      src={src}
                      alt=""
                      className="shop-pin-img"
                      loading="lazy"
                      decoding="async"
                      onError={() => setImgBroken((m) => ({ ...m, [p.id]: true }))}
                    />
                  ) : (
                    <div className="shop-pin-fallback" aria-hidden />
                  )}
                  <div className="shop-pin-gradient" aria-hidden />
                  <div className="shop-pin-caption">
                    <span className="shop-pin-name">{p.name}</span>
                    <span className="shop-pin-price">
                      {quote ? "Price on request" : formatGhs(p.basePriceCents!)}
                    </span>
                  </div>
                </div>
              </button>
              <div className="shop-pin-toolbar">
                {quote ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => openDetail(p)}>
                    Describe &amp; quote
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => addCatalogToCart(p, e)}>
                    Add to cart
                  </button>
                )}
                {(cart[p.id]?.quantity ?? 0) > 0 && <span className="shop-pin-badge">{cart[p.id]!.quantity}</span>}
              </div>
            </article>
          );
        })}
      </div>

      {products.length === 0 && !loadError && (
        <p className="shop-empty">No products listed yet — check back soon.</p>
      )}

      {modalNode}
    </main>
  );
}
