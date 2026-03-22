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
  basePriceCents: number;
  category: string;
};

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
  const [cart, setCart] = useState<Record<string, number>>({});
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [imgBroken, setImgBroken] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const viewedProducts = useRef(new Set<string>());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    track("shop_view");
    fetch("/api/products")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.data)) setProducts(j.data);
        else setLoadError("Could not load products");
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

  const cartTotalItems = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  function openDetail(p: Product) {
    if (!viewedProducts.current.has(p.id)) {
      viewedProducts.current.add(p.id);
      track("product_view", p.id);
    }
    setDetailProduct(p);
  }

  function addToCart(p: Product, e?: React.MouseEvent) {
    e?.stopPropagation();
    setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
    track("add_to_cart", p.id);
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
              <div
                className="shop-modal-image shop-pin-fallback"
                aria-hidden
              />
            )}
          </div>
          <div className="shop-modal-body">
            <p className="shop-modal-category">{detailProduct.category}</p>
            <h2 id="shop-modal-title" className="shop-modal-title">
              {detailProduct.name}
            </h2>
            <p className="shop-modal-price">{formatGhs(detailProduct.basePriceCents)}</p>
            <p className="shop-modal-desc">
              {detailProduct.description || "Delicious details coming soon."}
            </p>
            <div className="shop-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => addToCart(detailProduct)}>
                Add to cart
              </button>
              {(cart[detailProduct.id] ?? 0) > 0 && (
                <span className="shop-modal-in-cart">{cart[detailProduct.id]} in cart</span>
              )}
            </div>
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
          Scroll the gallery, tap a photo for details, then add to cart — like the apps you already use. Checkout opens when
          we&apos;re ready for real orders.
        </p>
      </header>

      <div className="shop-cart-bar">
        <div className="shop-cart-info">
          <span className="shop-cart-label">Cart</span>
          <span className="shop-cart-count">
            {cartTotalItems} item{cartTotalItems !== 1 ? "s" : ""}
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
          return (
            <article key={p.id} className={`shop-pin shop-pin-h${h}`} role="listitem">
              <button
                type="button"
                className="shop-pin-hit"
                onClick={() => openDetail(p)}
                aria-label={`${p.name}, ${formatGhs(p.basePriceCents)}. Tap for details.`}
              >
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
                    <span className="shop-pin-price">{formatGhs(p.basePriceCents)}</span>
                  </div>
                </div>
              </button>
              <div className="shop-pin-toolbar">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => addToCart(p, e)}
                >
                  Add to cart
                </button>
                {(cart[p.id] ?? 0) > 0 && (
                  <span className="shop-pin-badge">{cart[p.id]}</span>
                )}
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
