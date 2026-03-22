# La Madrina

Bakery admin and shop (Next.js + Prisma + MongoDB).

## Docs

- **[Analytics & insights](docs/analytics.md)** — business timezone, CSV export, shop funnel events, env vars.

## Production checklist

- **`SESSION_SECRET`** — at least **32 characters**. Used to sign the admin session cookie.
- **`DATABASE_URL`** — MongoDB connection string (Prisma).
- **`NODE_ENV=production`** — enables `Secure` on the admin session cookie (HTTPS only).
- **HTTPS** — required in production so session cookies are not sent over plain HTTP.
- After **schema changes**: run `npx prisma db push` and `npx prisma generate`, then **restart** the app. The dev server caches a global Prisma client; a restart avoids stale delegates after new models (e.g. `ShopAnalyticsEvent`, `AdminAuditLog`).

## Login rate limiting

Login attempts are limited **in-process** (per server instance). For multiple serverless instances or higher assurance, use a shared store (e.g. Redis / Upstash) for rate limits.

## Prisma

```bash
npx prisma generate
npx prisma db push
```

After schema changes (e.g. `ShopAnalyticsEvent`), run `db push` against your MongoDB.
