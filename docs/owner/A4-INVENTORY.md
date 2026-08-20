# Owner A4 — Inventory control

**Person A. Branch `feat/owner`.**

Ingredients, suppliers, purchase orders, and stock takes. This is what makes the recipe
builder from A3 actually mean something.

---

## Files

```
app/dashboard/inventory/page.tsx      (replaces the ComingSoon placeholder)
app/dashboard/inventory/actions.ts
components/inventory/inventory-manager.tsx
components/inventory/ingredients-tab.tsx
components/inventory/ingredient-dialog.tsx
components/inventory/suppliers-tab.tsx
components/inventory/supplier-dialog.tsx
components/inventory/purchase-orders-tab.tsx
components/inventory/purchase-order-dialog.tsx
components/inventory/stock-take-tab.tsx
```

---

## 1. `app/dashboard/inventory/actions.ts`

Same conventions as A3: `ActionResult`, `requireVenue()` first,
`revalidatePath("/dashboard/inventory")` last.

```ts
upsertSupplier(input: SupplierInput): Promise<ActionResult>
deleteSupplier(id: string): Promise<ActionResult>
upsertIngredient(input: IngredientInput): Promise<ActionResult>
deleteIngredient(id: string): Promise<ActionResult>
createPurchaseOrder(supplierId: string | null, lines: PurchaseOrderLineInput[]): Promise<ActionResult>
updatePurchaseOrderStatus(id: string, status: PoStatus): Promise<ActionResult>
deletePurchaseOrder(id: string): Promise<ActionResult>
applyStockTake(counts: { ingredient_id: string; counted_qty: number }[]): Promise<ActionResult<{ updated: number }>>
```

Input types:

```ts
export interface SupplierInput { id?: string; name: string; contact_name: string | null; phone: string | null; email: string | null; }
export interface IngredientInput { id?: string; name: string; unit: string; stock_qty: number; low_threshold: number; cost_per_unit: number; supplier_id: string | null; }
export interface PurchaseOrderLineInput { ingredient_id: string; qty: number; unit_cost: number; }
```

**Two of these must go through RPCs, not direct table writes:**

```ts
// status === "received" MUST use the RPC — it adds stock, writes a
// stock_movement per line, and recomputes total_cost, all in one transaction.
// A plain UPDATE would mark it received without moving any stock.
if (status === "received") {
  const { error } = await supabase.rpc("receive_purchase_order", { p_po_id: id });
} else {
  const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", id);
}
```

```ts
// applyStockTake -> supabase.rpc("apply_stock_take", { p_venue_id: venueId, p_counts: counts })
// Returns the number of ingredients actually adjusted.
```

`deletePurchaseOrder` must also `.eq("status", "draft")` — a received PO has already moved
stock and deleting it would leave the ledger lying.

`upsertIngredient` on update: destructure the id out and send the rest —
`const { id, ...rest } = input;` — so you never try to update the primary key.

---

## 2. `app/dashboard/inventory/page.tsx`

Server component. `requireVenue()`, then `Promise.all`: venue `currency`, `ingredients`
ordered by name, `suppliers` ordered by name, `purchase_orders` ordered by `created_at`
descending, and all `po_lines`. Pass to `<InventoryManager>`.

## 3. `components/inventory/inventory-manager.tsx`

`"use client"`. Four `Tabs`: **Ingredients**, **Suppliers**, **Purchase Orders**, **Stock
Take**. The Ingredients tab label carries a count of low-stock items in amber when any
exist (`stock_qty <= low_threshold`) — that number is the whole point of the section, so
it should be visible without clicking in.

---

## 4. Ingredients tab + dialog

Table columns: Name · Stock · Low at · Cost/unit · Supplier · (actions).

A low row shows an amber `AlertTriangle` before the quantity and a "Low" outline badge
after it. Supplier column resolves the id to a name, or `—`.

Dialog fields: name, unit (free text — `kg`, `L`, `unit`…), supplier `Select`, then stock
on hand / low threshold / cost per unit in a three-column row.

> **Select + "no value":** shadcn's `SelectItem` cannot have `value=""`. Use a sentinel
> like `const NO_SUPPLIER = "__none__"` for the "None" option and convert it back to `null`
> on submit.

Numeric fields use `z.coerce.number().min(0)` → therefore `useForm({ resolver })` with **no
explicit generic** (Trap 10). Re-seed the form when the dialog opens; here a plain
`useEffect` calling `reset(...)` is acceptable **only** because `reset` is not a `setState`
call — the lint rule targets state setters. If the linter still objects, use the render-time
pattern from A3.

Delete goes through `AlertDialog`, warning that recipes using the ingredient lose that line.

## 5. Suppliers tab + dialog

Straightforward CRUD. Table: Name · Contact · Phone · Email · (actions). Dialog: name
(required), contact name, phone, email.

## 6. Purchase orders tab + dialog

Each PO renders as a `Card`:

- Header: supplier name (or "No supplier"), total cost, line count, and a status `Badge`
  — `draft` outline, `ordered` secondary, `received` default.
- Body: one line per `po_line`, `{ingredient name}` left, `{qty} × {currency} {unit_cost}`
  right.
- Actions depend on status:
  - `draft` → **Mark ordered** and **Delete**
  - `ordered` → **Receive — updates stock** (make the consequence explicit in the label)
  - `received` → no actions

Dialog: supplier `Select` (same `NO_SUPPLIER` sentinel), then repeatable line rows of
`[ingredient Select] [qty] [unit cost] [delete]` in `grid-cols-[1fr_5rem_6rem_auto]`, a live
total, and "Create draft". Refuse to submit with zero lines. Disable "New purchase order"
entirely when the venue has no ingredients.

## 7. Stock take tab

Table: Ingredient · System stock · Counted (`Input`) · Variance.

- Counted values initialise from current stock, held in a `Record<string, number>`.
- Variance shows `+n` in `text-status-free`, `-n` in `text-status-red`, `—` when zero.
- The submit button is disabled unless at least one value differs, and its label shows the
  count: "Apply stock take (3 changed)".
- Submit sends **only the changed rows**, then `router.refresh()` and a toast reporting how
  many were adjusted.

---

## How the pieces connect

Worth understanding before you test:

1. A3's recipe builder links ingredients to menu items.
2. When a customer orders, `place_order` deducts every recipe ingredient and logs a
   `stock_movement` with reason `sale`.
3. Receiving a PO adds stock and logs `receive`.
4. A stock take writes the difference and logs `count`.
5. **All four paths** fire the `on_ingredient_stock_change` trigger, which raises a
   `low_stock` alert — once — whenever stock drops to or below the threshold and there is
   no unread alert for that ingredient already.

That is why low-stock logic lives in a database trigger rather than in `place_order`:
receiving and stock takes need it too.

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual:
1. Add a supplier, then an ingredient linked to it. ✓
2. Set the ingredient's stock at or below its threshold → the Low badge and the amber tab
   count appear. ✓
3. Go back to A3's item dialog → the Recipe tab now offers your ingredients, and cost and
   margin compute. ✓
4. Create a PO, mark ordered, receive → the ingredient's stock increases by the ordered
   quantity and the PO total is recomputed from its lines. ✓
5. Run a stock take with one changed value → stock updates, variance clears on reload. ✓

Commit: `git commit -am "Inventory: ingredients, suppliers, POs, stock takes"`
