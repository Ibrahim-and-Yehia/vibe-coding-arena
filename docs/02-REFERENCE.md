# Reference — read before writing any code

Stack, conventions, shared formulas, and **eleven traps** that each cost real debugging
time. The traps are not guessable. Read them.

---

## 1. Stack

| Thing | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (radix base, "nova" preset) |
| Database / Auth / Storage / Realtime | Supabase Cloud |
| Data fetching | TanStack Query (`@tanstack/react-query`) |
| Forms | react-hook-form + zod via `@hookform/resolvers` |
| Icons | lucide-react |
| Toasts | sonner |
| QR codes | qrcode.react |
| Dates | date-fns |

Node 20+. npm.

---

## 2. Naming and structure conventions

- Server Actions live in `actions.ts` next to the page that uses them.
- Client components go in `components/<area>/`, not inside `app/`.
- Every mutating Server Action returns `ActionResult` (see trap 9).
- Database columns are `snake_case`. TypeScript locals are `camelCase`. Row types keep
  the database's `snake_case` because they mirror the table exactly.
- Row type names are `<Table>Row`, e.g. `MenuItemRow`, `OrderRow`.

---

## 3. The wait-time formula

This is the product's most distinctive feature. It is computed **once, in the database, at
the moment the order is placed**, and stored on the order as `target_minutes`. It is never
recomputed, so the countdown never jumps around.

```
base   = max(prep_minutes) across all items in the order
extra  = (total_quantity - 1) * sla_extra_item_minutes     -- default 1.5
busy   = min(1 + active_kitchen_orders * sla_busy_factor, 1.6)   -- factor default 0.08
target = ceil((base + extra) * busy)
```

`active_kitchen_orders` counts orders currently `queued` or `preparing` for that venue.

The **client** only computes elapsed time and colour:

```
elapsed = now - placed_at            (minutes)
pct     = elapsed / target_minutes

pct <  sla_amber_pct (0.70)  -> green
pct <  sla_red_pct   (1.00)  -> amber
pct >= sla_red_pct           -> red, and the DB raises an order_late alert
```

All four tunables (`sla_extra_item_minutes`, `sla_busy_factor`, `sla_amber_pct`,
`sla_red_pct`) are columns on `venues` with those defaults.

---

## 4. Order status machine

```
queued -> preparing -> ready -> delivered
                                cancelled (from any state)
```

Advancing is done **only** through the `advance_order_status` RPC, which stamps
`started_at` / `ready_at` / `delivered_at` and raises an `order_ready` alert on `ready`.

Display labels: `queued` = "In queue", `preparing` = "Preparing", `ready` = "Ready",
`delivered` = "Delivered".

---

## 5. Table status colours (live floor)

A table's colour is derived, not stored:

| Condition | Status | Token |
|---|---|---|
| No open session | `free` | `--status-free` (green) |
| Open session, no active orders | `occupied` | `--status-occupied` (grey) |
| Open session with active orders | `active` | `--status-active` (cyan) |
| Any of its orders past amber threshold | `amber` | `--status-amber` |
| Any of its orders past red threshold | `late` | `--status-red` |

Worst status wins. `late` beats `amber` beats `active`.

---

## 6. Table sessions — the core model

A **sitting** is a `table_sessions` row. One customer party, one table, many orders.

```
Customer enters name + phone + picks a free table
        -> claim_table()  creates session (status 'open')
        -> place_order()  as many times as they like, all linked to that session
Owner clicks "Free table"
        -> free_table()   sets status 'closed', table becomes selectable again
```

A table is occupied **only** while it has an `open` session. This is enforced by a
partial unique index, so two customers cannot claim the same table even simultaneously —
the second one gets a `TABLE_TAKEN` error.

**Only staff can free a table.** It never frees itself.

---

## 7. Alert kinds

| Kind | Severity | Raised when |
|---|---|---|
| `new_order` | info | An order is placed |
| `order_ready` | info | An order is advanced to `ready` |
| `order_late` | critical | `check_late_orders` finds an order past target |
| `low_stock` | warning | An ingredient drops to/below its threshold |
| `call_waiter` | warning | Customer taps "Call waiter" |

Every alert has a per-venue sequential `alert_number` so staff can refer to it out loud.
Same for orders (`order_number`).

---

## 8. Live updates: polling first, realtime second

**This is a deliberate architectural decision. Do not "simplify" it away.**

- The dashboard polls one aggregate endpoint (`/api/venue/live`) every **2 seconds**.
  This is the baseline and it works everywhere.
- Supabase Realtime is subscribed on top, and on any change event it simply invalidates
  the query so the next render is immediate.

Why: some hosting platforms sandbox or throttle websockets. Realtime-only would fail
*silently* — the screen just stops updating. With polling underneath, the worst case is a
2-second refresh, which nobody watching can perceive.

---

# THE TRAPS

Eleven things that will break the build in non-obvious ways.

---

### Trap 1 — Next.js 16 renamed `middleware.ts` to `proxy.ts`

The file is `proxy.ts` at the project root, and the exported function must be named
`proxy`, not `middleware`.

```ts
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] };
```

It runs on the **nodejs runtime only** — the edge runtime is not supported for `proxy`.
Config flags renamed too: `skipMiddlewareUrlNormalize` is now `skipProxyUrlNormalize`.

---

### Trap 2 — Next.js 16: request APIs are always async

Synchronous access was removed entirely. These must all be awaited:

```ts
const cookieStore = await cookies();
const { slug } = await props.params;
const query = await props.searchParams;
```

Page and layout props use the generated helper types:

```ts
export default async function Page(props: PageProps<"/order/[slug]">) {
  const { slug } = await props.params;
}
export default function Layout({ children }: LayoutProps<"/dashboard">) { }
```

`PageProps` / `LayoutProps` are globally available — do not import them, and do not hand-write
the props type.

---

### Trap 3 — Next.js 16 uses Turbopack by default

Do **not** add `--turbopack` to the scripts. They are plain:

```json
"dev": "next dev",
"build": "next build"
```

---

### Trap 4 — The `Database` type needs an `__InternalSupabase` marker

Without it, this version of `supabase-js` silently resolves its internal generics to
`never` and **every query result becomes `never`**. You will get dozens of confusing
"Property 'id' does not exist on type 'never'" errors.

```ts
export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: { ... };
}
```

---

### Trap 5 — `Views` must be `Record<never, never>`

If you have no database views, it is tempting to write `Views: Record<string, never>`.
**That breaks everything.** It has a string index signature, and the query builder resolves
table names against `Tables & Views` — the index signature collapses every table to `never`.

```ts
Views: Record<never, never>;   // correct
Views: Record<string, never>;  // WRONG — breaks every query
```

---

### Trap 6 — Row types must be `type` aliases, not `interface`

```ts
export type VenueRow = { id: string; ... };        // correct
export interface VenueRow { id: string; ... }      // WRONG
```

TypeScript gives object *type aliases* an implicit index signature but does **not** give
one to interfaces. postgrest-js's result-type parser requires it. With `interface`, every
query silently returns `never`.

This applies to every `*Row` type. It does not apply to input/DTO interfaces that never
touch the query builder.

---

### Trap 7 — `Relationships` must be a properly-shaped array

Each table entry in the `Database` type needs a `Relationships` field. It cannot be `[]`
or `unknown[]` — postgrest-js pattern-matches on `Relationships[number]` and both of those
make it give up and return `never`.

Declare the shape locally (it is not a public export from the library):

```ts
interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}
```

Then every table uses `Relationships: Relationship[]`.

---

### Trap 8 — React 19 lint forbids `setState` inside an effect

`react-hooks/set-state-in-effect` is an **error**, not a warning. Three situations come up
in this build, each with a different correct fix:

**(a) Resetting form state when a dialog opens for a different item** — adjust state
during render, guarded by a key:

```ts
const openKey = open ? (item?.id ?? "new") : null;
const [seededKey, setSeededKey] = useState<string | null>(null);
if (openKey !== null && openKey !== seededKey) {
  setSeededKey(openKey);
  // ...set the other state here, call form.reset() here
}
```

**(b) Reading browser-only values** (`window.location.origin`, `sessionStorage`) — use
`useSyncExternalStore`, which also avoids hydration mismatch:

```ts
const noopSubscribe = () => () => {};
const origin = useSyncExternalStore(
  noopSubscribe,
  () => window.location.origin,
  () => ""                        // server snapshot
);
```

**(c) Reacting to fetched data changing** — do it during render, same as (a).

Effects are still correct for genuine subscriptions (Supabase Realtime channels, intervals).

---

### Trap 9 — Server Actions must return one consistent shape

If an action returns `{ error: string } | { id: string }`, every call site fails to narrow
and TypeScript complains about both branches. Use one type:

```ts
// lib/action-result.ts
export type ActionResult<T extends object = Record<never, never>> =
  { error?: string } & Partial<T>;
```

Note `Record<never, never>`, not `Record<string, never>` — same index-signature problem as
Trap 5.

Then:

```ts
async function createThing(): Promise<ActionResult<{ id: string }>> {
  if (error) return { error: error.message };
  return { id: data.id };
}
// caller
const result = await createThing();
if (result.error) { toast.error(result.error); return; }
// result.id is available here
```

Every action returns `{}` on success when it has nothing to hand back.

---

### Trap 10 — Do not pass an explicit generic to `useForm` when the schema uses `z.coerce`

`z.coerce.number()` makes the schema's input type differ from its output type, and an
explicit generic makes the resolver types conflict.

```ts
const { register } = useForm({ resolver: zodResolver(schema) });        // correct
const { register } = useForm<FormValues>({ resolver: zodResolver(schema) }); // WRONG
```

Let it infer.

---

### Trap 11 — Customer session goes in `sessionStorage`, not `localStorage`

The demo runs the owner dashboard and the customer site **side by side in one browser**.
`localStorage` is shared across all tabs of an origin, so two customer tabs would overwrite
each other's sitting and the demo would behave bizarrely.

`sessionStorage` is per-tab, so each window is an independent customer. Wrap it in a small
external store so components read it via `useSyncExternalStore` (see Trap 8b).

---

## Quick sanity checklist

After the foundation, before splitting up, all three must pass clean:

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

If `tsc` reports a wall of `never` errors, you have hit trap 4, 5, 6, or 7.
