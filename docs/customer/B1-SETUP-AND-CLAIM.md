# Customer B1 — Route, data layer, and claiming a table

**Person B. Branch `feat/customer`.**

You own the entire customer ordering app. It is reached from a QR code that Person A's
Settings page generates, pointing at `/order/<venue-slug>`.

---

## Read this first

**You never import anything Person A wrote, and they never import anything you write.**
Your only contract with their half of the app is the database. You call three RPCs; their
dashboard reads the rows those RPCs create.

You may freely use anything from the frozen foundation:

```
lib/types.ts            lib/supabase/admin.ts     lib/action-result.ts
lib/sla.ts              components/ui/**
```

You own, and only you touch:

```
app/order/[slug]/page.tsx
app/order/[slug]/actions.ts
components/order/**
```

**Do not** create files anywhere else. **Do not** add npm packages or shadcn components —
everything you need was installed in the foundation. If something is genuinely missing,
message Person A rather than installing it yourself; `package.json` conflicts are painful.

---

## The flow you are building

```
Open /order/<slug>
   |
   v
CLAIM SCREEN   name + phone + pick a table
               (occupied tables are visibly disabled)
   |  claim_table()
   v
MENU           categories, item cards, option picker, add to cart
   |
   v
REVIEW         quantities, per-item notes, order note, total
   |  place_order()
   v
TRACK          live status timeline + ETA, "Order more" returns to MENU
```

One sitting can place **many** orders. The session stays open until staff free the table.

---

## Files in this step

```
app/order/[slug]/page.tsx
app/order/[slug]/actions.ts
components/order/order-session-store.ts
components/order/customer-app.tsx     (created here, extended in B2 and B3)
```

---

## 1. `app/order/[slug]/actions.ts`

Every function here is a Server Action using `createAdminClient()` (service role).

**Why service role:** the customer is not logged in. There is no session, no JWT, nothing
RLS can key off. Running these on the server with the service role is what makes anonymous
ordering possible without exposing anything — the key never reaches the browser, and each
function only touches rows for the venue and session it was given.

```ts
claimTable(venueId, tableObjectId, customerName, customerPhone)
  : Promise<ActionResult<{ sessionId: string }>>

placeOrder(sessionId, items: PlaceOrderItemInput[], note: string | null)
  : Promise<ActionResult<{ orderNumber: number; orderId: string }>>

callWaiter(sessionId): Promise<ActionResult>

getOrderingState(venueId, sessionId: string | null)
```

### `claimTable`

Calls the `claim_table` RPC. **Translate the database error into something a human can
act on:**

```ts
if (error) {
  if (error.message.includes("TABLE_TAKEN")) {
    return { error: "Someone just took that table — pick another one." };
  }
  return { error: error.message };
}
return { sessionId: data.id };
```

`TABLE_TAKEN` comes from a partial unique index, so it is correct even if two people tap
the same table in the same instant.

### `placeOrder`

Calls the `place_order` RPC. Handle `SESSION_CLOSED` → *"This table was closed by staff.
Please start again."*

The RPC returns JSON; cast it and pull out the order:

```ts
const result = data as unknown as PlaceOrderResult;
return { orderNumber: result.order.order_number, orderId: result.order.id };
```

### `getOrderingState` — the polling endpoint

Returns everything the client needs to render:

```ts
{
  tables: { id, label, seats, areaId, occupied }[],
  session: TableSessionRow | null,
  orders: (OrderRow & { items: OrderItemRow[] })[],
}
```

Implementation:

1. `Promise.all`: all `floor_objects` where `kind = 'table'` ordered by `label`, and all
   `table_sessions` where `status = 'open'`, both for this venue.
2. `occupiedIds = new Set(sessions.map(s => s.table_object_id))` — a table is occupied iff
   an open session references it.
3. `session` = the open session matching `sessionId`, or `null`. **If it is null while the
   client thinks it has one, staff freed the table** — the client handles that in B3.
4. If there is a session, load its orders (by `order_number`) and their `order_items`, and
   nest the items onto each order. Skip the items query when there are no orders.

---

## 2. `app/order/[slug]/page.tsx`

Server component.

```ts
export async function generateMetadata(props: PageProps<"/order/[slug]">): Promise<Metadata>
export default async function OrderPage(props: PageProps<"/order/[slug]">)
```

> `params` is a Promise in Next.js 16 — `const { slug } = await props.params;`.
> `PageProps` is a global generated type; do not import it and do not hand-write the props.

1. `createAdminClient()`, look up the venue by `slug` with `.maybeSingle()`. If missing,
   `notFound()`.
2. `Promise.all`: active `menu_categories` by `sort_order`, all `menu_items` by
   `sort_order`, all `menu_item_options` by `sort_order`.
3. Render `<CustomerApp venue categories items options />`.

The menu is fetched **on the server, once**. Only tables, sessions and orders are polled —
the menu barely changes during a sitting and re-fetching it every 2 seconds is waste.

This page must **not** be wrapped in the dashboard's `dark` class. The customer app is the
warm light theme.

---

## 3. `components/order/order-session-store.ts`

**Trap 11 — this must be `sessionStorage`, not `localStorage`.**

The demo runs the owner dashboard and the customer site side by side in one browser.
`localStorage` is shared across every tab of an origin, so two customer tabs would
overwrite each other's sitting. `sessionStorage` is per-tab, so each window behaves like an
independent customer.

Expose it as a proper external store so components read it with `useSyncExternalStore` —
that avoids both `setState`-in-effect (Trap 8) and a hydration mismatch:

```ts
"use client";
import { useSyncExternalStore } from "react";

const key = (slug: string) => `serva:session:${slug}`;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStoredSession(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key(slug));
}
export function storeSession(slug: string, sessionId: string) {
  window.sessionStorage.setItem(key(slug), sessionId);
  emit();
}
export function clearStoredSession(slug: string) {
  window.sessionStorage.removeItem(key(slug));
  emit();
}

/** undefined = still server-rendering; null = no session; string = session id. */
export function useStoredSession(slug: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getStoredSession(slug),
    () => undefined
  );
}
```

The three-state return is deliberate. `undefined` lets the component distinguish "not
hydrated yet" from "definitely no session", so it can show a spinner instead of flashing
the claim screen at someone who is already seated.

---

## 4. `components/order/customer-app.tsx` — start it

`"use client"`. One component holding the whole flow; the views share cart and session
state, so splitting them across routes would mean lifting all of it anyway.

### State

```ts
const storedSession = useStoredSession(venue.slug);
const hydrated = storedSession !== undefined;
const sessionId = storedSession ?? null;

const [view, setView] = useState<"menu" | "review" | "track">("menu");
const [cart, setCart] = useState<CartLine[]>([]);
const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
const [configuring, setConfiguring] = useState<MenuItemRow | null>(null);
const [orderNote, setOrderNote] = useState("");
const [submitting, setSubmitting] = useState(false);
// claim form
const [name, setName] = useState("");
const [phone, setPhone] = useState("");
const [tableId, setTableId] = useState("");
const [claiming, setClaiming] = useState(false);
const [claimError, setClaimError] = useState<string | null>(null);
```

Note `sessionId` is **derived from the store**, not its own `useState`. That is what lets
`clearStoredSession()` push the UI back to the claim screen from anywhere.

```ts
interface CartLine {
  key: string;          // itemId|optionNames|note — identical configs stack
  menuItemId: string;
  name: string;
  unitPrice: number;    // base price + option deltas
  qty: number;
  note: string;
  options: OrderOptionSnapshot[];
}
```

### Polling

```ts
const { data: state, refetch } = useQuery({
  queryKey: ["ordering-state", venue.id, sessionId],
  queryFn: () => getOrderingState(venue.id, sessionId),
  refetchInterval: 2000,
  enabled: hydrated,
});
```

`enabled: hydrated` stops it firing during SSR. The session id is in the key so claiming a
table refetches immediately with the new scope.

### Not-hydrated guard

```tsx
if (!hydrated) {
  return <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
  </div>;
}
```

### The claim screen

Rendered when `!sessionId || !state?.session`. Centred, `max-w-md`.

- Venue name as an h1, "Order from your table" beneath.
- Name input, phone input (`type="tel"`).
- **Table picker:** a `grid-cols-4` of buttons, one per table, each showing the label and
  either `{seats} seats` or **"Taken"**. Occupied tables are `disabled` with
  `opacity-40 cursor-not-allowed`. The selected one gets `border-primary bg-accent`.
  Because the list polls every 2s, a table someone else takes goes grey while you are
  looking at it.
- An inline error area for `claimError`.
- "Start ordering" button.

`handleClaim` validates all three fields with specific messages ("Please enter your name."),
calls `claimTable`, and **on error also calls `refetch()`** so a `TABLE_TAKEN` failure
immediately shows the updated availability. On success, `storeSession(venue.slug, sessionId)`
— which notifies the store and re-renders straight into the menu.

Show an empty state when the venue has no tables at all.

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual — you need a venue to exist. Either wait for Person A to push A1, or create one
yourself in the Supabase SQL Editor. Get the slug:

```sql
select name, slug from venues;
```

Then open `http://localhost:3000/order/<that-slug>`.

1. The venue name and a grid of tables render. ✓
2. Submitting with a blank field shows the right message. ✓
3. Claiming a free table moves you past the claim screen. ✓
4. In Supabase, `table_sessions` has your row with `status = 'open'`. ✓
5. Reload the page — you stay seated (session came back from `sessionStorage`). ✓
6. Open the same URL in a **different browser** (not just a tab) — your table now shows
   "Taken" and cannot be selected. ✓
7. Try to claim it anyway by clicking fast in both — the second one gets the
   "Someone just took that table" message. ✓

Clean up your test rows before demo day:
```sql
delete from table_sessions where customer_name = '<whatever you typed>';
```

Commit: `git commit -am "Customer: route, actions, session store, table claiming"`
