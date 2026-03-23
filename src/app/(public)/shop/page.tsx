import type { Metadata } from "next";
import { ShopPageClient } from "./ShopPageClient";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse and order cupcakes, celebration cakes, Ghana pies, sausage rolls, samosas, and gizzards from La Madrina Bakery in Tema. Pickup or delivery.",
};

export default function ShopPage() {
  return <ShopPageClient />;
}
