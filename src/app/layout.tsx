import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lamadrina.com"),
  title: {
    default: "La Madrina Bakery — Cakes, Pies & More · Tema, Ghana",
    template: "%s | La Madrina Bakery",
  },
  description:
    "La Madrina Bakery in Mitchel Street, Tema. Order celebration cakes, cupcakes, Ghana pies, sausage rolls, samosas, and gizzards online. Pickup or delivery via Yango, Uber & Bolt.",
  keywords: [
    "bakery tema ghana",
    "ghana pies tema",
    "celebration cakes accra",
    "cupcakes tema",
    "custom cakes ghana",
    "la madrina bakery",
    "order cakes online ghana",
  ],
  openGraph: {
    type: "website",
    siteName: "La Madrina Bakery",
    title: "La Madrina Bakery — Cakes, Pies & More · Tema, Ghana",
    description:
      "Celebration cakes, cupcakes, Ghana pies, sausage rolls, samosas, and gizzards. Order online for pickup or delivery in Tema.",
    images: [{ url: "/images/logo/la%20madrina%20logo%20black.png", width: 800, height: 400, alt: "La Madrina Bakery" }],
  },
  twitter: {
    card: "summary",
    site: "@lamadrinabakery",
    title: "La Madrina Bakery — Cakes, Pies & More · Tema, Ghana",
    description:
      "Order celebration cakes, Ghana pies, cupcakes & more online. Pickup from Mitchel Street, Tema or delivery via Yango, Uber & Bolt.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="app-body">{children}</body>
    </html>
  );
}
