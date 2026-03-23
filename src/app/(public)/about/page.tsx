import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "La Madrina Bakery is based in Mitchel Street, Tema, Ghana. We bake celebration cakes, cupcakes, Ghana pies, sausage rolls, samosas, and gizzards fresh every day.",
};

const HOURS = [
  { day: "Mon – Fri", time: "6 am – 6 pm" },
  { day: "Saturday", time: "7 am – 4 pm" },
  { day: "Sunday", time: "Closed" },
];

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/la.madrina____bakery" },
  { label: "TikTok", href: "https://www.tiktok.com/@la.madrina.bakery" },
  { label: "Facebook", href: "https://www.facebook.com/share/188wmk6wp9/" },
  { label: "X (Twitter)", href: "https://x.com/lamadrinabakery" },
];

export default function AboutPage() {
  return (
    <main className="about-shell">

      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-inner">
          <p className="about-eyebrow">Our story</p>
          <h1 className="about-title">
            Baked with<br />
            <em>purpose.</em>
          </h1>
          <p className="about-lead">
            La Madrina started as a love for good food and a belief that everyday occasions
            deserve something special. From Mitchel Street, Tema, we bake fresh every day —
            celebration cakes built to order, golden Ghana pies, cupcakes, samosas, sausage
            rolls, and gizzards packed with flavour.
          </p>
          <p className="about-lead">
            Every item leaves our kitchen made by hand, without shortcuts. That has not changed
            since the beginning, and it will not change as we grow.
          </p>
          <Link href="/shop" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
            Order now
          </Link>
        </div>
        <div className="about-hero-image-col" aria-hidden="true">
          <img
            src="/images/logo/La%20Madrina%20logo%20white.png"
            alt=""
            className="about-hero-logo"
          />
        </div>
      </section>

      {/* Info grid */}
      <section className="about-info-grid">

        {/* Opening hours */}
        <div className="about-info-card">
          <p className="about-info-heading">Opening hours</p>
          <ul className="about-hours-list">
            {HOURS.map(({ day, time }) => (
              <li key={day} className="about-hours-row">
                <span>{day}</span>
                <span>{time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Location */}
        <div className="about-info-card">
          <p className="about-info-heading">Find us</p>
          <p className="about-info-body">
            Mitchel Street<br />
            Tema, Greater Accra<br />
            Ghana
          </p>
          <a
            href="https://wa.me/233546368357"
            target="_blank"
            rel="noopener noreferrer"
            className="about-contact-link"
          >
            WhatsApp: 0546 368 357 ↗
          </a>
        </div>

        {/* Delivery */}
        <div className="about-info-card">
          <p className="about-info-heading">Getting your order</p>
          <p className="about-info-body">
            Pick up directly from us on Mitchel Street, or request a rider through
            Yango, Uber, or Bolt to our address once your payment is confirmed.
          </p>
          <Link href="/shop" className="about-contact-link">
            Start an order ↗
          </Link>
        </div>

      </section>

      {/* Socials */}
      <section className="about-socials-section">
        <p className="about-info-heading" style={{ marginBottom: "1rem" }}>Follow along</p>
        <div className="about-socials-list">
          {SOCIALS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="about-social-pill"
            >
              {label} ↗
            </a>
          ))}
        </div>
      </section>

    </main>
  );
}
