# Customer B2 — Menu browsing, options, cart, review

**Person B. Branch `feat/customer`.**

Continues `components/order/customer-app.tsx`. No new files except the option picker, which
can live in the same file.

---

## The header (visible on every seated view)

Sticky, `bg-background/95 backdrop-blur`, bottom border:

- Left: venue name, and beneath it `Table {label} · {customer name}` in small muted text.
  The table label comes from `state.tables.find(t => t.id === session.table_object_id)`.
- Right: a ghost "Waiter" button with a `ConciergeBell` icon → `callWaiter(sessionId)` →
  toast "A waiter is on the way". (Wire this now; it raises an alert on Person A's
  dashboard.)

---

## The menu view

### Category tabs

A horizontally scrollable `Tabs` strip under the header, one trigger per category.

### Item cards

For items in the active category where `is_available` is true:

- 80px rounded image, or an `ImageOff` icon on `bg-muted` when there is no photo
- name, then description clamped to two lines (`line-clamp-2`)
- price in the venue's currency
- **"Sold out" destructive badge** when `track_stock && stock_qty <= 0`, with the whole card
  at `opacity-50` and `disabled`

Use a plain `<img>` with `{/* eslint-disable-next-line @next/next/no-img-element */}` above
it, not `next/image`.

The whole card is a `<button>`:

- item **has** option groups → open the option picker dialog
- item has **none** → add straight to the cart, one tap

Empty state when a category has nothing available: "Nothing in this section right now."

### Precomputing options

Group the flat options array once, memoised:

```ts
const optionsByItem = useMemo(() => {
  const map: Record<string, MenuItemOptionRow[]> = {};
  for (const o of options) (map[o.menu_item_id] ??= []).push(o);
  return map;
}, [options]);
```

---

## The option picker dialog

A `Dialog` showing the item name and description, then one block per `group_name`, each
listing its options as selectable rows: option name left, `+{currency}{delta}` right when
the delta is non-zero. Selecting is single-choice **within a group** — store it as
`Record<groupName, MenuItemOptionRow>`.

Below the groups, a "Special request" input ("No onions, extra crispy…").

The confirm button shows the computed price: `Add · {currency} {base + Σ deltas}`.

### Seeding defaults without an effect

When the dialog opens for a new item, pre-select every option marked `is_default`. **Do
this during render, guarded by a key** — not in a `useEffect` (Trap 8a):

```ts
const [seededFor, setSeededFor] = useState<string | null>(null);
if (item && seededFor !== item.id) {
  setSeededFor(item.id);
  const defaults: Record<string, MenuItemOptionRow> = {};
  for (const [group, opts] of Object.entries(groups)) {
    const def = opts.find((o) => o.is_default);
    if (def) defaults[group] = def;
  }
  setSelected(defaults);
  setNote("");
}
```

---

## Cart logic

```ts
function addToCart(item: MenuItemRow, chosen: OrderOptionSnapshot[], note: string) {
  const unitPrice = item.price + chosen.reduce((s, o) => s + o.price_delta, 0);
  const key = `${item.id}|${chosen.map(o => o.option_name).join(",")}|${note}`;
  setCart(prev => {
    const existing = prev.find(l => l.key === key);
    if (existing) return prev.map(l => l.key === key ? { ...l, qty: l.qty + 1 } : l);
    return [...prev, { key, menuItemId: item.id, name: item.name, unitPrice, qty: 1, note, options: chosen }];
  });
  toast.success(`${item.name} added`);
}
```

The composite `key` is what makes "medium burger" and "well-done burger" separate lines
while two identical mediums stack into `qty: 2`.

```ts
function changeQty(key: string, delta: number) {
  setCart(prev => prev.flatMap(l => {
    if (l.key !== key) return [l];
    const qty = l.qty + delta;
    return qty <= 0 ? [] : [{ ...l, qty }];   // dropping to zero removes the line
  }));
}
```

Derived values:
```ts
const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
const cartCount = cart.reduce((s, l) => s + l.qty, 0);
```

---

## The review view

Reached from the bottom bar. Starts with a ghost "Back to menu" button.

Each cart line: name, chosen options in small muted text, the note in italic quotes, unit
price, and `[−] {qty} [+]` controls on the right.

Then:
- an optional order-level `Textarea`: "Anything else? (optional)", placeholder "Allergies,
  timing, anything the kitchen should know"
- a separator and the total in large type
- the line **"You'll pay your server — no payment needed here."** — say it explicitly so
  nobody hunts for a card field. Escape the apostrophe: `You&apos;ll`.
- "Place order"

Empty cart → "Your cart is empty."

### Submitting

```ts
const result = await placeOrder(
  sessionId,
  cart.map(l => ({
    menu_item_id: l.menuItemId,
    qty: l.qty,
    note: l.note || undefined,
    options: l.options,
  })),
  orderNote || null
);
if (result.error) { toast.error(result.error); return; }
toast.success(`Order #${result.orderNumber} placed`);
setCart([]); setOrderNote(""); setView("track"); refetch();
```

Clearing the cart and jumping to Track is what makes a second round feel natural rather
than like starting over.

---

## The bottom bar

Fixed to the bottom, `max-w-md`, `backdrop-blur`, above a `pb-28` on the page container so
content never hides behind it.

- **Cart has items and you are not on Track** → one wide button:
  `Review {n} items` with the running total pushed right.
- **Otherwise** → two half-width buttons, Menu and Orders, the active one in the primary
  variant. The Orders button shows the order count when there is one.

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual, seated at a table:

1. Categories switch and show the right items. ✓
2. An item with no options adds in one tap and toasts. ✓
3. An item with options opens the dialog with defaults pre-selected. ✓
4. Changing an option updates the price on the Add button. ✓
5. Adding the same item twice with the same options stacks to qty 2; with different
   options it makes a second line. ✓
6. The bottom bar shows the count and total. ✓
7. Review lets you change quantities; dropping to zero removes the line. ✓
8. Placing the order clears the cart and switches to Track. ✓
9. In Supabase, `orders` has a row with a sequential `order_number` and a computed
   `target_minutes`, and `order_items` has one row per line with `options_snapshot`
   populated. ✓
10. An item with `track_stock` on and `stock_qty` 0 shows "Sold out" and cannot be
    tapped. ✓

Commit: `git commit -am "Customer: menu, options, cart, review"`
