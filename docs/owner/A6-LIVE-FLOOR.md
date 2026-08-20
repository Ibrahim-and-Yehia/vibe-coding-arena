# Owner A6 — Live floor, orders, kitchen display, alerts

**Person A. Branch `feat/owner`.**

The payoff. The floor plan from A5 comes alive, orders land on it, timers run, and alerts
find you. This is the part the demo is built around.

---

## Files

```
lib/live-types.ts
app/api/venue/live/route.ts
hooks/use-live-venue.ts
app/dashboard/orders/actions.ts
components/orders/countdown-ring.tsx
components/orders/order-status-buttons.tsx
components/floor/table-drawer.tsx
components/floor/live-floor.tsx
components/orders/kitchen-display.tsx
components/orders/orders-list.tsx
components/dashboard/notification-sheet.tsx   (REPLACE the A2 scaffold)
app/dashboard/floor/page.tsx                  (replace placeholder)
app/dashboard/orders/page.tsx                 (replace placeholder)
app/dashboard/kitchen/page.tsx                (replace placeholder)
```

---

## 1. The live data strategy — do not simplify this

**Polling is the baseline. Realtime is an accelerator.** Re-read `02-REFERENCE.md` §8.

One endpoint returns everything the dashboard needs. Every live screen shares one query,
so five components on screen means one request every two seconds, not five.

## 2. `lib/live-types.ts`

```ts
export interface LiveVenuePayload {
  areas: FloorAreaRow[];
  objects: FloorObjectRow[];
  sessions: TableSessionRow[];      // open sessions only
  orders: OrderRow[];               // active only: queued | preparing | ready
  orderItems: OrderItemRow[];
  alerts: AlertRow[];               // most recent 50
  slaAmberPct: number;
  slaRedPct: number;
  currency: string;
  kitchenLabel: string;
  fetchedAt: string;
}
export const ACTIVE_ORDER_STATUSES = ["queued", "preparing", "ready"] as const;
```

## 3. `app/api/venue/live/route.ts`

A `GET` route handler.

**No venue id comes from the client.** Resolve it from the session — otherwise anyone could
read any venue by guessing ids.

```
1. createClient() from lib/supabase/server; getUser(); 401 if none.
2. profiles.venue_id; 404 if none.
3. await supabase.rpc("check_late_orders", { p_venue_id: venueId })
   -> raises order_late alerts BEFORE we read alerts back, so a newly-late
      order shows up on this very poll rather than the next one.
4. Promise.all:
     venues -> sla_amber_pct, sla_red_pct, currency, kitchen_label
     floor_areas   by sort_order
     floor_objects by z
     table_sessions where status = 'open'
     orders where status in (queued, preparing, ready), by order_number
     alerts by created_at desc, limit 50
5. order_items for those order ids (skip the query entirely if there are none —
   .in() with an empty array is wasteful and can error).
6. NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
```

That `no-store` header matters — without it the poll can be served from cache and the
screen freezes.

## 4. `hooks/use-live-venue.ts`

```ts
export const LIVE_QUERY_KEY = ["venue-live"];
export function useLiveVenue(venueId: string);   // returns the TanStack query
export function useInvalidateLive();             // returns () => void
```

The query:

```ts
useQuery<LiveVenuePayload>({
  queryKey: LIVE_QUERY_KEY,
  queryFn: async () => {
    const res = await fetch("/api/venue/live", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load live venue state");
    return res.json();
  },
  refetchInterval: 2000,
  refetchIntervalInBackground: true,
});
```

Then, in a `useEffect` (a genuine subscription, so an effect is correct here), open a
Supabase Realtime channel named `venue-${venueId}` and subscribe to `postgres_changes` for
`orders`, `table_sessions`, and `alerts`, each filtered `venue_id=eq.${venueId}`. Every
handler does exactly one thing: `queryClient.invalidateQueries({ queryKey: LIVE_QUERY_KEY })`.
Return a cleanup that calls `supabase.removeChannel(channel)`.

`useInvalidateLive` is what mutation buttons call so the UI updates immediately instead of
waiting up to 2s for the next poll.

## 5. `app/dashboard/orders/actions.ts`

```ts
advanceOrder(orderId: string, status: OrderStatus): Promise<ActionResult>   // -> advance_order_status RPC
freeTable(sessionId: string): Promise<ActionResult>                        // -> free_table RPC
markAlertRead(alertId: string): Promise<ActionResult>
markAllAlertsRead(): Promise<ActionResult>
```

`advanceOrder` must revalidate `/dashboard/floor`, `/dashboard/orders`, and
`/dashboard/kitchen`.

---

## 6. `components/orders/countdown-ring.tsx`

```ts
export function useNow(intervalMs = 1000): Date;
export function CountdownRing({ placedAt, targetMinutes, amberPct, redPct, now, size = 44 });
export function waitLevelFor(placedAt, targetMinutes, amberPct, redPct, now): WaitLevel;
```

`useNow` is called **once per screen** and the resulting `Date` is passed down to every
ring. One interval for the page, not one per order — otherwise thirty orders means thirty
timers all re-rendering independently.

The ring is an SVG circle with `strokeDasharray = 2πr` and
`strokeDashoffset = circumference * (1 - min(pct, 1))`, rotated `-90°` so it fills from the
top. Stroke colour by level: green `--status-free`, amber `--status-amber`, red
`--status-red`. Centre shows `formatMinutesSeconds(remainingMinutes)` — negative when
overdue, which is exactly the information wanted.

## 7. `components/orders/order-status-buttons.tsx`

`"use client"`. `<OrderStatusButton orderId status />` renders the single button for
whatever comes next, or nothing when there is no next state:

```
queued    -> "Start preparing"  (ChefHat)
preparing -> "Mark ready"       (BellRing)
ready     -> "Mark delivered"   (CheckCheck)
```

Calls `advanceOrder`, then `useInvalidateLive()`. Local `busy` state disables it and swaps
in a spinner. Reused by the floor drawer, the kitchen display, and the orders list.

---

## 8. `components/floor/live-floor.tsx`

`"use client"`. `useVenue()` for the id, `useLiveVenue()` for data, `useNow()` for the clock.

### Deriving table status

Build `Record<objectId, LiveTableInfo>` inside a `useMemo` keyed on `[data, now]`:

```
for each floor object with kind === "table":
  session = sessions.find(s => s.table_object_id === obj.id)
  if no session          -> { status: "free", orderNumbers: [] }
  orders = orders.filter(o => o.session_id === session.id)
  status = orders.length ? "active" : "occupied"
  for each order:
    level = waitLevelFor(order.placed_at, order.target_minutes, amberPct, redPct, now)
    if level === "red"                        -> status = "late"
    else if level === "amber" && !late        -> status = "amber"
  orderNumbers = orders.map(o => o.order_number)
```

Worst status wins.

### Layout

- Area `Tabs`, a pulsing "Live" indicator, and an "Edit layout" button to
  `/dashboard/floor/edit`.
- A summary line: *N tables seated · M active orders*, plus *K running late* in red when
  non-zero.
- `<FloorCanvas objects={areaObjects} live={liveByTable} onTableClick={setSelectedTableId} />`
- A colour legend underneath — five dots with labels. Without it nobody knows what grey
  versus cyan means.
- `<Skeleton className="h-[420px]" />` while loading.

## 9. `components/floor/table-drawer.tsx`

`"use client"`. A `Sheet` opened by clicking a table.

Free table → "No one seated here. Customers claim a table from the ordering page."

Seated → customer name and phone in a bordered block, then a card per order containing:

- `CountdownRing`, order number, status `Badge`, total right-aligned
- every line: `{qty}× {name_snapshot}`, chosen option names in parentheses, and any item
  note in quotes on its own line
- the order-level note if present
- a full-width `OrderStatusButton`

Below the orders, a separator and the **running total** across the sitting.

Footer: **Free table**, behind an `AlertDialog` confirming that it closes the sitting and
makes the table available again on the ordering page.

## 10. `components/orders/kitchen-display.tsx`

`"use client"`. Three columns — In queue / Preparing / Ready — each with a count badge.

Tickets are deliberately large and readable across a kitchen:

- order number at `text-2xl font-bold`
- table label and customer name underneath
- a 52px `CountdownRing`
- items at `text-base` with the quantity bold; options indented and muted; notes in
  **amber italic** so they cannot be missed
- a full-width `OrderStatusButton`
- **a 2px border that goes amber then red with the wait level** — the whole point is that a
  passing glance tells you which ticket is in trouble

## 11. `components/orders/orders-list.tsx`

`"use client"`. Filter tabs (All active / In queue / Preparing / Ready) over a `Table`:
`#` · timer (small 38px ring) · table · customer (name + phone beneath) · item count ·
total · status badge · action button.

## 12. `components/dashboard/notification-sheet.tsx` — replace the A2 scaffold

`"use client"`. Reads `alerts` from `useLiveVenue`.

- The `Bell` trigger carries an unread count badge (`9+` above nine) in
  `bg-status-red`.
- "Mark all read" in the header when anything is unread.
- Each row: a kind-specific icon coloured by severity, the `alert_number` in a small
  outline badge, the message, and a relative timestamp via `formatDistanceToNow` from
  date-fns. Unread rows get a tinted background and a dot.
- Clicking an unread row marks it read, then `useInvalidateLive()`.
- Wrap the list in `ScrollArea`.

Icons: `new_order` → `ShoppingBag`, `order_ready` → `ConciergeBell`, `order_late` →
`Clock`, `low_stock` → `Package`, `call_waiter` → `AlertTriangle`.
Severity colours: info → `text-status-active`, warning → `text-status-amber`, critical →
`text-status-red`.

## 13. The three pages

Thin server components; all the work is in the client components.

- `/dashboard/floor` → `<LiveFloor />`
- `/dashboard/orders` → `<OrdersList />`
- `/dashboard/kitchen` → `<KitchenDisplay />`

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual — you cannot fully test this until Person B's customer app is merged, but you can
verify everything up to order arrival:

1. `/dashboard/floor` renders your layout with every table green (free). ✓
2. The "Live" indicator pulses and the Network tab shows a request to
   `/api/venue/live` every ~2 seconds. ✓
3. Clicking a free table opens the drawer with the "no one seated" message. ✓
4. `/dashboard/kitchen` shows three empty columns. ✓
5. The bell opens the notification sheet with no unread badge. ✓

To test with real orders before B merges, insert a session and an order by hand in the
Supabase SQL Editor:

```sql
select claim_table(
  (select id from venues limit 1),
  (select id from floor_objects where kind='table' limit 1),
  'Test Customer', '555-0100'
);

select place_order(
  (select id from table_sessions where status='open' limit 1),
  jsonb_build_array(jsonb_build_object(
    'menu_item_id', (select id from menu_items limit 1), 'qty', 2)),
  null
);
```

The table should turn cyan with a numbered pin within about a second, a ticket should appear
on the kitchen display, and the bell should show an unread alert. **Delete these rows before
demoing** — no fake data in the final state:

```sql
delete from table_sessions where customer_name = 'Test Customer';
```

(Orders cascade with the session.)

Commit: `git commit -am "Live floor, orders, kitchen display, alerts"`
