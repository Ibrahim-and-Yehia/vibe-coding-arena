# Serva

A hospitality operations platform for cafes, restaurants and bars.

Owners get a menu and inventory system, a floor plan they draw themselves that then goes
live with real orders, and real-time order tracking with wait-time alerts. Customers order
from a per-venue QR code — no app to install.

---

## Getting started

```bash
npm install
cp .env.local.example .env.local     # then fill in the three values
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

From your Supabase project → **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL — the `https://<ref>.supabase.co` one, **not** the dashboard link |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` key — server-only, never commit it |

### Database

Run the two migrations in `supabase/migrations/` in the Supabase SQL Editor, in order.
Then in **Authentication → Sign In / Providers → Email**: turn the email provider **on**
and **Confirm email** **off**, and press Save *inside that panel* — it has its own save
button that is easy to miss.

---

## What's in it

**Owner dashboard** (`/dashboard`) — dark ops console
- Menu builder: categories, items, photos, option groups, per-item prep times
- Recipes linking menu items to ingredients, with live cost per dish and margin
- Inventory: ingredients, suppliers, purchase orders, stock takes, low-stock alerts
- Floor plan editor: snap-to-grid SVG canvas, tables and fixtures, multiple areas
- Live floor: the same plan you drew, colour-coded, with numbered order pins
- Kitchen display: Queued / Preparing / Ready, one tap to advance
- Numbered alerts for new orders, late orders, waiter calls and low stock

**Customer app** (`/order/<venue-slug>`) — light, mobile-first
- Claim a table by name, phone and table number (occupied tables are unselectable)
- Browse the menu, configure options, build a cart
- Place multiple orders across one sitting
- Live status tracking with an honest ETA

**Marketing site** (`/`) — landing, features, pricing, about, contact

---

## How it works

**Wait-time targets** are computed once, in the database, when the order is placed:

```
base   = slowest item's prep time
extra  = (total quantity - 1) × 1.5 min
busy   = 1 + (active kitchen orders × 0.08), capped at 1.6
target = ceil((base + extra) × busy)
```

Stored on the order so the countdown never jumps. The client only computes elapsed time
and the green → amber → red colour.

**Table sessions.** A sitting is one `table_sessions` row: one party, one table, many
orders. A table is occupied only while it has an open session, enforced by a partial
unique index — two customers cannot claim the same table even simultaneously. Only staff
can free a table.

**Live updates** poll `/api/venue/live` every 2 seconds as the baseline, with Supabase
Realtime layered on top purely to make changes feel instant. Realtime alone would fail
*silently* on hosts that throttle websockets; with polling underneath, the worst case is
a 2-second refresh.

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase
(Postgres, Auth, Storage, Realtime) · TanStack Query · react-hook-form + zod

No Docker, no local database, no filesystem writes — deploys anywhere Next.js runs.

---

## Rebuilding from scratch

`docs/` contains a complete step-by-step build guide: database SQL, a shared foundation,
and separate tracks for the owner and customer sides so two people can work in parallel
without merge conflicts.

Start at [`docs/00-START-HERE.md`](docs/00-START-HERE.md).

`docs/02-REFERENCE.md` documents eleven specific traps in this stack — Next.js 16's
renamed `proxy.ts`, async request APIs, and four separate ways to make every Supabase
query silently resolve to `never`. Read it before writing code; none of them are
guessable.
