import type { Metadata } from "next";
import { TrackPageClient } from "./TrackPageClient";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Track your La Madrina Bakery order using your email and order reference number.",
  robots: { index: false, follow: false },
};

export default function TrackPage() {
  return <TrackPageClient />;
}
