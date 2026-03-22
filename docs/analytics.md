# Analytics & insights

## Business timezone

- **`BUSINESS_TIMEZONE`** (optional, default `Africa/Accra`): IANA zone used for “last N days” windows and daily trend buckets.
- Insight periods are **inclusive** of “today” in that timezone, stored as UTC instants for MongoDB queries (`gte` / `lt`).

## Prior-period comparison

- The API compares the current window to the **immediately preceding** window of the **same number of days**.
- Percent change is `null` in JSON when the prior value is zero (avoid divide-by-zero).

## CSV export (admin, authenticated)

- Overview: `GET /api/admin/insights/export?kind=overview&days=30`
- Pricing: `GET /api/admin/insights/export?kind=pricing&days=30`
- Use the **Export** buttons on **Insights** (session cookie required). Amounts are in **pesewas** (1 GHS = 100) unless the row label says `percent`.

### Data sensitivity (PII)

- CSVs can include **business metrics** and, depending on export shape, **aggregates tied to operations** (e.g. revenue by category). Treat downloads like **internal financial data**.
- **Do not** email CSVs unencrypted; store them securely; restrict who can access admin export.
- **Do not** log full export bodies, full order payloads, or customer contact fields in application logs.

## Shop funnel events (public)

`POST /api/shop/analytics` with JSON body:

| `eventType`       | When (in demo shop)        |
|-------------------|----------------------------|
| `shop_view`       | Shop page load             |
| `product_view`    | Customer expands “Details” |
| `add_to_cart`     | “Add to cart”              |
| `begin_checkout`  | “Checkout (demo)”          |

Optional `productId` (Mongo ObjectId string) must reference an existing product.

Events are written with the **native MongoDB driver** (`insertOne`) so they work on a **standalone** local MongoDB. Prisma’s `create()` path uses transactions, which require a **replica set**; production Atlas clusters already satisfy that, but the native insert avoids noisy errors in dev and keeps the same `ShopAnalyticsEvent` collection shape.

**Production:** add rate limiting and bot protection; this endpoint is intentionally open for the storefront.

## Database

After pulling changes that add `ShopAnalyticsEvent`, run:

```bash
npx prisma db push
npx prisma generate
```

## Alerts (overview)

- **`ALERT_CANCEL_RATE_PCT`**: optional env; default `15`. Warning if cancellation rate exceeds this.
- Revenue-down warning if revenue vs prior period drops more than **10%**.
