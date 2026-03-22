/**
 * Resolve image for shop masonry: saved imageUrl, else category-based stock photo.
 * Uses Unsplash CDN (hotlink-friendly); replace with your own CDN in production.
 */
const CATEGORY_FALLBACK: Record<string, string> = {
  bread:
    "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80&auto=format&fit=crop",
  pastries:
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80&auto=format&fit=crop",
  cakes:
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop",
  custom:
    "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80&auto=format&fit=crop",
  other:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&auto=format&fit=crop",
};

export function resolveShopProductImage(category: string, imageUrl: string | null | undefined): string {
  const u = imageUrl?.trim();
  if (u) return u;
  const key = category.toLowerCase();
  return CATEGORY_FALLBACK[key] ?? CATEGORY_FALLBACK.other;
}

/** Vary pin height for masonry rhythm (0 = tall, 1 = medium, 2 = short). */
export function pinHeightVariant(index: number): 0 | 1 | 2 {
  return (index % 3) as 0 | 1 | 2;
}
