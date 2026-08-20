# Owner A3 — Menu builder

**Person A. Branch `feat/owner`.**

Categories, items, photos, option groups, and the recipe builder with live cost and margin.

---

## Files

```
app/dashboard/menu/page.tsx          (replaces the ComingSoon placeholder)
app/dashboard/menu/actions.ts
components/menu/menu-manager.tsx
components/menu/category-manager-dialog.tsx
components/menu/item-dialog.tsx
components/menu/item-card.tsx
```

---

## 1. `app/dashboard/menu/actions.ts`

Every export is a Server Action returning `ActionResult` (Trap 9), starts with
`await requireVenue()`, and ends with `revalidatePath("/dashboard/menu")` then `return {}`.

```ts
createCategory(name: string): Promise<ActionResult>
updateCategory(id: string, name: string): Promise<ActionResult>
deleteCategory(id: string): Promise<ActionResult>
reorderCategories(orderedIds: string[]): Promise<ActionResult>
reorderMenuItems(orderedIds: string[]): Promise<ActionResult>
upsertMenuItem(input: MenuItemInput): Promise<ActionResult<{ id: string }>>
deleteMenuItem(id: string): Promise<ActionResult>
saveMenuItemOptions(menuItemId: string, options: MenuItemOptionInput[]): Promise<ActionResult>
saveRecipeLines(menuItemId: string, lines: RecipeLineInput[]): Promise<ActionResult>
```

Input types to export from this file:

```ts
export interface MenuItemInput {
  id?: string;                 // present = update, absent = insert
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  prep_minutes: number;
  image_url: string | null;
  is_available: boolean;
  track_stock: boolean;
  stock_qty: number;
}
export interface MenuItemOptionInput { group_name: string; option_name: string; price_delta: number; is_default: boolean; }
export interface RecipeLineInput { ingredient_id: string; qty_per_unit: number; }
```

Behaviour notes:

- `createCategory` sets `sort_order` to the current category count.
- `upsertMenuItem` with no `id` sets `sort_order` to the current item count **within that
  category**, inserts, `.select("id").single()`, and returns `{ id }`. With an `id` it
  updates and returns `{ id: input.id }`. Either way the caller gets an id back, which is
  what unlocks the Options and Recipe tabs for a brand-new item.
- `saveMenuItemOptions` and `saveRecipeLines` are **delete-then-insert** for that item.
  Simpler than diffing and perfectly fine at this scale.
- The reorder actions run their updates through `Promise.all`, then check
  `results.find(r => r.error)` and surface the first failure.

---

## 2. `app/dashboard/menu/page.tsx`

Server component. `requireVenue()`, then `Promise.all` of six queries: the venue's
`currency`, `menu_categories` (ordered by `sort_order`), `menu_items` (ordered by
`sort_order`), all `menu_item_options`, all `recipe_lines`, and `ingredients` ordered by
name. Pass everything to `<MenuManager>`.

Options and recipe lines are fetched unfiltered — RLS already scopes them to this venue,
and it avoids a second round-trip when a dialog opens.

---

## 3. `components/menu/menu-manager.tsx`

`"use client"`. The orchestrator.

- Category `Tabs` across the top, each showing its item count as a small muted number.
- Right side: "Categories" (opens the category dialog) and "Add item" buttons.
- Body: items in the active category, filtered and sorted by `sort_order`, as a
  two-column grid of `ItemCard`.
- Empty states: if there are no categories at all, show a centred prompt to create the
  first one. If a category has no items, show a dashed placeholder.
- Delete uses `AlertDialog` for confirmation, never a bare `confirm()`.
- After every successful mutation call `router.refresh()`.

## 4. `components/menu/category-manager-dialog.tsx`

`"use client"`. A `Dialog` listing categories, each row with:

- up/down arrow buttons that swap adjacent ids and call `reorderCategories`
- an `Input` seeded with `defaultValue` that renames `onBlur` (only if changed and non-empty)
- a delete button

Below a separator: an input + Add button for a new category, also submitting on Enter.

## 5. `components/menu/item-card.tsx`

`"use client"`. Compact card: 64px image thumbnail (or an `ImageOff` icon), name,
truncated description, price right-aligned, then badges — prep time with a `Clock` icon,
"Hidden" if not available, and stock (`{n} left`, or a destructive "Sold out" at zero) when
`track_stock` is on. Edit (pencil) and delete (trash) buttons on the right.

Use a plain `<img>`, not `next/image`, and add
`{/* eslint-disable-next-line @next/next/no-img-element */}` above it. Supabase Storage URLs
with arbitrary dimensions are not worth the `next/image` configuration here.

---

## 6. `components/menu/item-dialog.tsx` — the big one

`"use client"`. Three `Tabs`: **Details**, **Options**, **Recipe**.

Options and Recipe are **disabled until the item exists** (`activeItemId` is null for a new
item). Creating it on the Details tab flips `activeItemId` and unlocks them — the button
label changes from "Create item" to "Save details".

### Re-seeding state when the dialog opens

The dialog is reused for every item, so its local state must reset when it opens for a
different one. **Do this during render, not in an effect** (Trap 8a):

```ts
const openKey = open ? (item?.id ?? "new") : null;
const [seededKey, setSeededKey] = useState<string | null>(null);
if (openKey !== null && openKey !== seededKey) {
  setSeededKey(openKey);
  setActiveItemId(item?.id ?? null);
  setImageUrl(item?.image_url ?? null);
  setOptions(/* map initialOptions */);
  setRecipeLines(/* map initialRecipeLines */);
  reset({ /* all details fields */ });
}
```

### Details tab

Fields: image upload, category (`Select` in a `Controller`), name, description
(`Textarea`), price and prep time side by side, `is_available` switch, `track_stock`
switch, and — only when `track_stock` is on — a stock quantity input.

Zod schema uses `z.coerce.number()` for price / prep_minutes / stock_qty because number
inputs give strings. **Therefore call `useForm({ resolver })` with no explicit generic**
(Trap 10).

Conditionally showing the stock field based on another field's value needs `Controller` on
`track_stock` (or `useWatch`) — plain `register` will not re-render on change.

Image upload: `<Input type="file" accept="image/*">` → `uploadMedia(file, "menu-items")`
from `lib/storage.ts`, store the returned URL in local state, show it in a preview square,
disable the input while uploading.

### Options tab

Rows of `[group name] [option name] [price delta] [delete]` in a
`grid-cols-[1fr_1fr_5rem_auto]`. "Add option" appends a blank row. "Save options" calls
`saveMenuItemOptions`.

Empty state: *No options yet — e.g. a &quot;Doneness&quot; group with Rare / Medium / Well.*
(escape those quotes).

### Recipe tab

If the venue has no ingredients yet, show: "Add ingredients in Inventory first to build a
recipe." Otherwise rows of `[ingredient Select] [qty per unit] [delete]`, plus "Add
ingredient".

Below the rows, a summary box:

```
Cost per dish     {currency} {cost}
Margin at current price   {margin}%
```

where

```
cost   = Σ (ingredient.cost_per_unit × line.qty_per_unit)
margin = price > 0 ? ((price - cost) / price) × 100 : null
```

The margin must react to the **live** price field, not the saved value, so the owner sees
it move as they type. Read it with `useWatch({ control, name: "price" })`. Colour the
margin `text-destructive` when negative.

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual:
1. The preset categories and items from onboarding are listed. ✓
2. Add a category, rename it, reorder it, delete it. ✓
3. Create an item — Options and Recipe unlock afterwards. ✓
4. Upload a photo; it appears on the card and survives a reload. ✓
5. Add option rows, save, reopen — they are still there. ✓
6. Toggle `track_stock` on, set 0 → the card shows "Sold out". ✓
7. Recipe tab shows the ingredient empty state (you have none until A4). ✓

Commit: `git commit -am "Menu builder"`
