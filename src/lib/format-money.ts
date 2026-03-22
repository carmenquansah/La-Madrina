/**
 * All list prices and money amounts in the app are stored as integer **pesewas** (1 GHS = 100).
 * Display uses Ghana Cedis (ISO **GHS** — often written informally as GHC).
 */
export const STORE_CURRENCY_CODE = "GHS" as const;

const ghsFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: STORE_CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format pesewas (cents) as GHS, e.g. GH₵12.50 */
export function formatGhs(pesewas: number): string {
  return ghsFormatter.format(pesewas / 100);
}
