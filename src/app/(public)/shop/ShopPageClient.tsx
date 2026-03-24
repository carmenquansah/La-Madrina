"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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

type PaymentInfo = {
  network: string;
  momoNumber: string;
  momoName: string;
  whatsapp: string;
};

type ConfirmedOrder = {
  orderId: string;
  orderRef: string;
  totalCents: number;
  paymentInfo: PaymentInfo;
};

type CheckoutStep = "cart" | "details" | "confirmed";

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

const ALL = "All";

export function ShopPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [imgBroken, setImgBroken] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL);
  const viewedProducts = useRef(new Set<string>());

  const [specText, setSpecText] = useState("");
  const [quoteEstimate, setQuoteEstimate] = useState<QuoteEstimateData | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");

  // Checkout flow
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);

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
    const locked = !!detailProduct || cartOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailProduct, cartOpen]);

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

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return [ALL, ...cats];
  }, [products]);

  const visibleProducts = useMemo(
    () => (activeCategory === ALL ? products : products.filter((p) => p.category === activeCategory)),
    [products, activeCategory]
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, line]) => ({ product: products.find((p) => p.id === id), line }))
        .filter((x): x is { product: Product; line: CartLine } => !!x.product),
    [cart, products]
  );

  function updateQuantity(productId: string, delta: number) {
    setCart((c) => {
      const ex = c[productId];
      if (!ex) return c;
      const nextQty = ex.quantity + delta;
      if (nextQty <= 0) {
        const { [productId]: _removed, ...rest } = c;
        return rest;
      }
      return { ...c, [productId]: { ...ex, quantity: nextQty } };
    });
  }

  function removeFromCart(productId: string) {
    setCart((c) => {
      const { [productId]: _removed, ...rest } = c;
      return rest;
    });
  }

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
    setCheckoutStep("details");
    setSubmitError("");
  }

  function closeCart() {
    setCartOpen(false);
    // Reset to cart step when drawer closes (unless confirmed)
    if (checkoutStep !== "confirmed") setCheckoutStep("cart");
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          preferredDate: preferredDate || null,
          orderType,
          deliveryAddress: orderType === "delivery" ? deliveryAddress.trim() || null : null,
          notes: orderNotes.trim() || null,
          items: cartLines.map(({ product, line }) => ({
            productId: product.id,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            specifications: line.specifications ?? null,
          })),
        }),
      });
      const j = await res.json();
      if (!j.ok) {
        setSubmitError(j.message ?? "Something went wrong. Please try again.");
        return;
      }
      setConfirmedOrder({
        orderId: j.data.orderId,
        orderRef: j.data.orderRef,
        totalCents: cartTotalCents,
        paymentInfo: j.data.paymentInfo,
      });
      setCart({});
      setCheckoutStep("confirmed");
      track("begin_checkout");
    } catch {
      setSubmitError("Could not place order. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
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

  const cartDrawerNode =
    mounted &&
    createPortal(
      <>
        <div
          className={`cart-backdrop${cartOpen ? " cart-backdrop-visible" : ""}`}
          aria-hidden="true"
          onClick={closeCart}
        />
        <aside
          className={`cart-drawer${cartOpen ? " cart-drawer-open" : ""}`}
          aria-label="Shopping cart"
          aria-hidden={!cartOpen}
        >
          {/* ── Header ── */}
          <div className="cart-drawer-header">
            <div className="cart-drawer-heading-row">
              {checkoutStep === "details" && (
                <button
                  type="button"
                  className="cart-back-btn"
                  onClick={() => setCheckoutStep("cart")}
                  aria-label="Back to cart"
                >
                  ←
                </button>
              )}
              <h2 className="cart-drawer-title">
                {checkoutStep === "cart" && "Your Cart"}
                {checkoutStep === "details" && "Your Details"}
                {checkoutStep === "confirmed" && "Order Placed!"}
              </h2>
            </div>
            <button
              type="button"
              className="cart-drawer-close"
              aria-label="Close"
              onClick={closeCart}
            >
              ×
            </button>
          </div>

          {/* ── Step: Cart ── */}
          {checkoutStep === "cart" && (
            <>
              <div className="cart-drawer-body">
                {cartLines.length === 0 ? (
                  <div className="cart-empty">
                    <p className="cart-empty-icon">🛍</p>
                    <p className="cart-empty-text">Your cart is empty.</p>
                    <p className="cart-empty-sub">Browse the menu and add something delicious.</p>
                  </div>
                ) : (
                  <ul className="cart-item-list">
                    {cartLines.map(({ product, line }) => (
                      <li key={product.id} className="cart-item">
                        <div className="cart-item-info">
                          <p className="cart-item-name">{product.name}</p>
                          {line.specifications && (
                            <p className="cart-item-specs">{line.specifications}</p>
                          )}
                          <p className="cart-item-unit">{formatGhs(line.unitPriceCents)} each</p>
                        </div>
                        <div className="cart-item-right">
                          <div className="cart-qty-row">
                            <button type="button" className="cart-qty-btn" aria-label="Decrease" onClick={() => updateQuantity(product.id, -1)}>−</button>
                            <span className="cart-qty-val">{line.quantity}</span>
                            <button type="button" className="cart-qty-btn" aria-label="Increase" onClick={() => updateQuantity(product.id, 1)}>+</button>
                          </div>
                          <p className="cart-item-total">{formatGhs(line.quantity * line.unitPriceCents)}</p>
                          <button type="button" className="cart-remove-btn" onClick={() => removeFromCart(product.id)}>Remove</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {cartLines.length > 0 && (
                <div className="cart-drawer-footer">
                  <div className="cart-subtotal-row">
                    <span className="cart-subtotal-label">Subtotal</span>
                    <span className="cart-subtotal-value">{formatGhs(cartTotalCents)}</span>
                  </div>
                  <p className="cart-subtotal-note">
                    Custom cake prices are estimates — the bakery confirms the final price before accepting.
                  </p>
                  <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={beginCheckout}>
                    Proceed to checkout →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Step: Customer details ── */}
          {checkoutStep === "details" && (
            <form className="checkout-form" onSubmit={submitOrder}>
              <div className="cart-drawer-body">
                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="co-name">Full name *</label>
                  <input id="co-name" type="text" className="checkout-input" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="co-phone">Phone number *</label>
                  <input id="co-phone" type="tel" className="checkout-input" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 024 XXX XXXX" />
                  <p className="checkout-hint">We use this to verify your MoMo payment.</p>
                </div>
                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="co-email">Email *</label>
                  <input id="co-email" type="email" className="checkout-input" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="you@email.com" />
                </div>
                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="co-date">Preferred date *</label>
                  <input
                    id="co-date"
                    type="date"
                    className="checkout-input"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={(() => {
                      const d = new Date(Date.now() + 48 * 60 * 60 * 1000);
                      return d.toISOString().split("T")[0];
                    })()}
                  />
                  <p className="checkout-hint">All orders must be placed at least 48 hours in advance.</p>
                </div>
                <div className="checkout-field">
                  <p className="checkout-label">Collection *</p>
                  <div className="checkout-radio-group">
                    <label className="checkout-radio">
                      <input type="radio" name="orderType" value="pickup" checked={orderType === "pickup"} onChange={() => setOrderType("pickup")} />
                      Pickup — Mitchel Street, Tema
                    </label>
                    <label className="checkout-radio">
                      <input type="radio" name="orderType" value="delivery" checked={orderType === "delivery"} onChange={() => setOrderType("delivery")} />
                      Delivery via Yango / Uber / Bolt
                    </label>
                  </div>
                  {orderType === "delivery" && (
                    <div className="checkout-delivery-block">
                      <p className="checkout-delivery-hint">
                        We will send the order to your address. Request a rider via Yango, Uber, or Bolt — the driver will collect from us and deliver to you.
                      </p>
                      <label className="checkout-label" htmlFor="co-address">Delivery address *</label>
                      <textarea
                        id="co-address"
                        className="checkout-input checkout-textarea"
                        rows={2}
                        required={orderType === "delivery"}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="House / apartment number, street, area, landmark…"
                      />
                    </div>
                  )}
                </div>
                <div className="checkout-field">
                  <label className="checkout-label" htmlFor="co-notes">Notes / special requests</label>
                  <textarea id="co-notes" className="checkout-input checkout-textarea" rows={3} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Allergies, occasion, any special requests…" />
                </div>
                {submitError && <p className="checkout-error" role="alert">{submitError}</p>}
              </div>
              <div className="cart-drawer-footer">
                <div className="cart-subtotal-row">
                  <span className="cart-subtotal-label">Total</span>
                  <span className="cart-subtotal-value">{formatGhs(cartTotalCents)}</span>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
                  {submitting ? "Placing order…" : "Place order →"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step: Confirmation + payment instructions ── */}
          {checkoutStep === "confirmed" && confirmedOrder && (
            <div className="cart-drawer-body">
              <div className="order-confirmed">
                <div className="order-confirmed-icon" aria-hidden="true">✓</div>
                <h3 className="order-confirmed-title">Order received!</h3>
                <p className="order-confirmed-ref">Reference: <strong>{confirmedOrder.orderRef}</strong></p>

                <div className="payment-instructions">
                  <p className="payment-instructions-heading">How to pay</p>
                  <p className="payment-instructions-amount">{formatGhs(confirmedOrder.totalCents)}</p>
                  <div className="payment-instructions-steps">
                    <p>Send via <strong>{confirmedOrder.paymentInfo.network} Mobile Money</strong> to:</p>
                    <div className="payment-momo-box">
                      <span className="payment-momo-number">{confirmedOrder.paymentInfo.momoNumber}</span>
                      <span className="payment-momo-name">{confirmedOrder.paymentInfo.momoName}</span>
                    </div>
                    {confirmedOrder.paymentInfo.whatsapp && (
                      <p className="payment-whatsapp">
                        After sending, WhatsApp us at{" "}
                        <a
                          href={`https://wa.me/${confirmedOrder.paymentInfo.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="payment-whatsapp-link"
                        >
                          {confirmedOrder.paymentInfo.whatsapp}
                        </a>{" "}
                        with your order reference <strong>{confirmedOrder.orderRef}</strong>.
                      </p>
                    )}
                    {!confirmedOrder.paymentInfo.whatsapp && (
                      <p className="payment-confirm-note">
                        After sending, contact us with your order reference <strong>{confirmedOrder.orderRef}</strong> so we can confirm.
                      </p>
                    )}
                  </div>
                  <p className="payment-note">
                    Your order will be prepared once payment is verified by the bakery.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "1.5rem", width: "100%" }}>
                  <Link href={`/track?email=${encodeURIComponent(customerEmail)}&ref=${confirmedOrder.orderRef}`} className="btn btn-primary" style={{ textAlign: "center" }}>
                    Track this order →
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutStep("cart");
                      setConfirmedOrder(null);
                    }}
                  >
                    Back to shop
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </>,
      document.body
    );

  return (
    <main className="shop-shell">
      {/* ── Hero ── */}
      <section className="shop-hero">
        <div className="shop-hero-content">
          <p className="shop-hero-eyebrow">La Madrina · Order online</p>
          <h1 className="shop-hero-title">The Menu</h1>
          <p className="shop-hero-lead">
            Tap any item for details and add it to your cart. Custom cakes show a suggested price range
            once you describe what you need.
          </p>
        </div>
        <div className="shop-hero-arc" aria-hidden="true">
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,56 Q720,0 1440,56 L1440,56 L0,56 Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* ── Category pills ── */}
      {categories.length > 1 && (
        <div className="shop-category-bar" role="tablist" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              className={`shop-cat-pill${activeCategory === cat ? " shop-cat-pill-active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Floating cart button ── */}
      <button
        type="button"
        className={`cart-fab${cartTotalItems > 0 ? " cart-fab-active" : ""}`}
        onClick={() => setCartOpen(true)}
        aria-label={`Open cart — ${cartTotalItems} item${cartTotalItems !== 1 ? "s" : ""}`}
      >
        <span className="cart-fab-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </span>
        {cartTotalItems > 0 && (
          <span className="cart-fab-label">
            <span className="cart-fab-count">{cartTotalItems}</span>
            <span className="cart-fab-total">{formatGhs(cartTotalCents)}</span>
          </span>
        )}
      </button>

      {loadError && (
        <p className="shop-error" role="alert">
          {loadError}
        </p>
      )}

      <div className="shop-masonry" role="list">
        {visibleProducts.map((p, index) => {
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

      {visibleProducts.length === 0 && !loadError && (
        <p className="shop-empty">
          {products.length === 0 ? "No products listed yet — check back soon." : `Nothing in "${activeCategory}" yet.`}
        </p>
      )}

      {modalNode}
      {cartDrawerNode}
    </main>
  );
}
