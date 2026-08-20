# Customer B3 — Order tracking, table-closed handling, polish

**Person B. Branch `feat/customer`.**

The last piece: the customer watches their order move, and the app handles staff freeing
the table out from under them.

---

## The track view

Heading "Your orders", then a card per order from `state.orders` (already sorted by
`order_number`, with `items` nested by `getOrderingState`).

### Each order card

**Header row:** `Order #{order_number}` bold left, total right.

**Status timeline** — four steps across the width:

| Step | Label | Icon |
|---|---|---|
| `queued` | In queue | `ShoppingBag` |
| `preparing` | Preparing | `ChefHat` |
| `ready` | Ready | `BellRing` |
| `delivered` | Delivered | `Check` |

```ts
const currentStep = STATUS_STEPS.findIndex(s => s.status === order.status);
// step i is "done" when i <= currentStep
```

A done step gets a filled circle (`border-primary bg-primary text-primary-foreground`) and
a medium-weight label; the rest are outlined and muted. Because the page polls every 2
seconds, this advances on its own as the kitchen works — the customer never refreshes.

**ETA line** — hidden once `delivered` or `cancelled`:

```ts
const wait = computeWaitState({
  placedAt: order.placed_at,
  targetMinutes: order.target_minutes,
  amberPct: venue.sla_amber_pct,
  redPct: venue.sla_red_pct,
});
```

- `wait.remainingMinutes > 0` → *"About {formatMinutesSeconds(remaining)} to go"*
- otherwise → *"Taking a little longer than expected — thanks for your patience"*

Never show a negative countdown to a customer. The owner's screen shows the overrun in red
because that is actionable for staff; for the customer it is just annoying.

Both helpers come from `lib/sla.ts` (frozen foundation — import, do not reimplement).

**Item list** — `{qty}× {name_snapshot}` in small muted text.

### Below the cards

An outlined **"Order more"** button (`Utensils` icon) that returns to the menu. The session
stays open, so the next order joins the same sitting and the same running total on the
owner's screen.

Empty state: "No orders yet."

---

## Staff freed the table

The most important edge case. When the owner clicks "Free table", the session closes.
`getOrderingState` then returns `session: null` while the client still has an id in
`sessionStorage`.

Detect it **during render**, not in an effect (Trap 8c):

```ts
const tableWasClosed = !!sessionId && !!state && !state.session;
if (tableWasClosed) {
  clearStoredSession(venue.slug);   // notifies the store -> re-render
  setCart([]);
  setView("menu");
  toast.info("Your table was closed by staff.");
}
```

`clearStoredSession` fires the store's listeners, `useStoredSession` returns `null`, and
the component renders the claim screen on the very next pass. No effect, no flash of a
broken seated view, no lint error.

Clearing the cart matters — those items belong to a sitting that no longer exists.

---

## Call waiter

Already wired in B2's header. Confirm it: tap it and check an `alerts` row appears with
`kind = 'call_waiter'` and `severity = 'warning'`. It shows up on the owner's notification
sidebar within a second.

---

## Polish pass

**Mobile first.** This is the only part of the product used on a phone. Everything is
inside `mx-auto w-full max-w-md`. Test at 375px wide. Tap targets at least 44px tall.

**Loading.** The pre-hydration spinner from B1 covers the initial load. TanStack Query keeps
previous data during refetches, so nothing flickers between polls.

**Toasts.** Confirm each: item added, order placed (with its number), waiter called, table
closed. They are the app's only feedback channel on a small screen.

**Escaped entities.** Every apostrophe and quote in JSX text must be `&apos;` / `&quot;` or
`react/no-unescaped-entities` fails the build. This will catch you out — check
`You&apos;ll pay your server`, `hasn&apos;t ordered yet`, and anything similar.

**Currency.** Always `{venue.currency} {amount.toFixed(2)}` — never a hard-coded `$`.

---

## Full checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

All three clean. Then, with Person A's dashboard running in a second window:

1. Claim a table, place an order. ✓
2. Owner's floor plan shows a numbered pin on that table within ~1s. ✓
3. Owner advances In queue → Preparing → Ready → Delivered; your timeline follows each
   step without you touching anything. ✓
4. "Order more" places a second order on the same sitting; the owner sees both under one
   table with a combined running total. ✓
5. Tap "Waiter" → the owner's notification sidebar gets a warning alert. ✓
6. Owner clicks "Free table" → within ~2s you are returned to the claim screen with the
   toast, and that table is selectable again. ✓
7. Resize to 375px — everything is usable, nothing overflows horizontally. ✓

---

## Clean up before demo day

Delete every test sitting you created. Orders and order items cascade:

```sql
delete from table_sessions where venue_id = (select id from venues where slug = '<your-slug>');
```

Optionally clear the alerts they generated:

```sql
delete from alerts where venue_id = (select id from venues where slug = '<your-slug>');
```

**The final state must contain no test data** — just the venue, its menu, and its floor
plan.

---

## Person B is done — merge first

```bash
git add -A
git commit -m "Customer: order tracking, table-closed handling, polish"
git push -u origin feat/customer

git checkout main
git pull
git merge feat/customer
git push
```

Tell Person A that `main` has moved so they can merge on top. Then help with
`owner/A7-MARKETING.md` if it is still open.
