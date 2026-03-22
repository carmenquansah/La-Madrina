# La Madrina Bakery — System Architecture

## 1. Overview

Two main surfaces:

- **Customer**: Browse products, place orders, add specifications (quantities, dates, customizations, notes).
- **Admin**: Authenticated dashboard to manage business data and view insights (pricing, revenue, expenses, demand).

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (SPA/SSR)                        │
│  Customer: Shop, Cart, Checkout, Order Confirmation             │
│  Admin: Login, Dashboard, Products, Orders, Expenses, Insights   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / API
┌───────────────────────────────▼─────────────────────────────────┐
│                     BACKEND (API + Auth)                          │
│  Routes: /api/orders, /api/products, /api/admin/*, /api/insights  │
│  Middleware: auth (admin), validation, rate limiting              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                     DATABASE (MongoDB)                           │
│  products, orders, order_items, expenses, admin users            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model (Core Entities)

| Entity       | Purpose |
|-------------|---------|
| **products** | Catalog: name, description, base price, category, active flag. |
| **orders**   | Customer order: contact info, delivery/pickup date, status, total, notes. |
| **order_items** | Line items: product_id, quantity, unit_price, specifications (JSON: custom text, options). |
| **expenses** | Admin-only: date, category, amount, description (ingredients, labor, rent, etc.). |
| **admin_users** | Admin login: email, password hash, created_at. |

Demand and revenue are derived from `orders` + `order_items`; no separate “demand” table.

---

## 4. Customer Flow

1. Browse products (read-only list with categories).
2. Add to cart with quantity and specifications (e.g. “No nuts”, “Message on cake”).
3. Checkout: contact name, phone, email, preferred date, notes.
4. Order submitted → status “pending”; confirmation shown (and optionally emailed later).
5. No customer accounts required for v1 (guest checkout); optional registration can be added later.

---

## 5. Admin Features & Insights

- **Auth**: Login with email/password; session in HTTP-only cookie; all `/api/admin/*` and insights protected.
- **CRUD**: Products, view/cancel/update orders, record expenses.
- **Insights** (read-only, from DB aggregations):
  - **Revenue**: By day/week/month; by product.
  - **Expenses**: By category and time period.
  - **Demand**: Top products by quantity sold; trends over time; busy days.
  - **Pricing**: Revenue per product, average order value; support for adjusting prices based on data.

Insights are served by API routes that run queries (or call a small service layer) and return JSON for the admin UI to chart/display.

---

## 6. Security

- **Admin**: Passwords hashed (e.g. bcrypt); sessions with secure, HTTP-only cookies; no tokens in localStorage for auth.
- **Secrets**: API keys and DB URL in environment variables only.
- **Input**: Validate and sanitize all inputs; restrict admin routes by role.
- **HTTPS**: Enforced in production.

---

## 7. Tech Stack (Recommended)

| Layer    | Choice        | Rationale |
|----------|---------------|-----------|
| Frontend | Next.js (React) | One codebase, API routes possible, good DX. |
| Backend  | Next.js API routes or Express | Start with API routes for simplicity. |
| Database | MongoDB        | Document store for orders, products, expenses. |
| ORM      | Prisma or Drizzle | Type-safe schema, migrations. |
| Auth     | Custom (bcrypt + cookies) or NextAuth | Keep admin auth simple and explicit. |

---

## 8. Directory Structure (Target)

```
/
├── docs/
│   └── ARCHITECTURE.md
├── src/
│   ├── app/                    # Next.js app router (or pages/)
│   │   ├── (customer)/         # Shop, cart, checkout
│   │   ├── admin/              # Admin dashboard (protected)
│   │   └── api/                # API routes
│   ├── components/
│   ├── lib/
│   │   ├── db/                 # Prisma/Drizzle client, schema
│   │   ├── auth/               # Session, hash, admin check
│   │   └── validations/        # Schemas (e.g. Zod)
│   └── types/
├── prisma/                     # If using Prisma
│   └── schema.prisma
├── .env.example
├── package.json
└── README.md
```

---

## 9. Implementation Phases

- **Phase 1**: Project scaffold, DB schema, seed data (products, one admin user).
- **Phase 2**: Customer: product list, cart, checkout, order creation API and confirmation.
- **Phase 3**: Admin auth (login, session, protected layout).
- **Phase 4**: Admin CRUD (products, orders list/update, expenses).
- **Phase 5**: Admin insights (revenue, expenses, demand, simple pricing view) and dashboard UI.

This document will be updated as the implementation evolves.
