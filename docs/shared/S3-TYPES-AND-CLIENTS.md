# Shared 3/3 — Types and Supabase clients

**Both people, together. This is the highest-risk file in the whole build.**

`lib/types.ts` hand-mirrors the database. There is no CLI type generation here (that needs
Docker), so it is written by hand — and four separate non-obvious rules must all be
satisfied or **every query in the app silently returns `never`** and you get a wall of
meaningless errors.

Re-read traps 4, 5, 6 and 7 in `docs/02-REFERENCE.md` before starting.

---

## 1. `lib/types.ts`

### 1a. Enum unions — mirror the SQL enums exactly

```ts
export type BusinessType = "cafe" | "restaurant" | "bar";
export type OrderStatus = "queued" | "preparing" | "ready" | "delivered" | "cancelled";
export type PoStatus = "draft" | "ordered" | "received";
export type StockReason = "receive" | "sale" | "count" | "correction";
export type SessionStatus = "open" | "closed";
export type AlertKind = "new_order" | "order_ready" | "order_late" | "low_stock" | "call_waiter";
export type AlertSeverity = "info" | "warning" | "critical";
export type FloorObjectKind =
  | "table" | "kitchen" | "bar" | "pos" | "entrance"
  | "restroom" | "wall" | "plant" | "stairs" | "other";
export type FloorObjectShape = "round" | "square" | "rect" | "stool" | "line" | "rect_fixture";

export interface OrderOptionSnapshot {
  group_name: string;
  option_name: string;
  price_delta: number;
}
```

### 1b. The two helper types — copy these exactly

```ts
// Shape of postgrest-js's GenericRelationship, redeclared locally because it is
// not a public export. Must be an array of objects with THIS shape — not `[]`,
// not `unknown[]`. Both of those make the result-type parser return `never`
// for every query. (Trap 7)
interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

// OptionalInsertKeys = columns with a DB default or that are nullable, so
// callers may omit them on insert. Update allows any non-id column, including
// server-managed timestamps.
interface Table<Row, OptionalInsertKeys extends keyof Row = never> {
  Row: Row;
  Insert: Omit<Row, OptionalInsertKeys> & Partial<Pick<Row, OptionalInsertKeys>>;
  Update: Partial<Omit<Row, "id">>;
  Relationships: Relationship[];
}
```

### 1c. Row types — every one must be `type`, never `interface` (Trap 6)

Mirror each table's columns exactly, with `snake_case` names. Nullable SQL columns become
`| null`. `timestamptz` becomes `string`. `numeric` becomes `number`. `jsonb` becomes its
concrete shape.

```ts
export type VenueRow = {
  id: string; owner_id: string; name: string; slug: string;
  business_type: BusinessType; currency: string; logo_url: string | null;
  kitchen_label: string;
  sla_extra_item_minutes: number; sla_busy_factor: number;
  sla_amber_pct: number; sla_red_pct: number;
  next_order_number: number; next_alert_number: number;
  created_at: string;
};

export type ProfileRow = {
  id: string; email: string; full_name: string | null;
  venue_id: string | null; created_at: string;
};

export type MenuCategoryRow = {
  id: string; venue_id: string; name: string;
  sort_order: number; is_active: boolean; created_at: string;
};

export type MenuItemRow = {
  id: string; venue_id: string; category_id: string | null;
  name: string; description: string | null; price: number;
  image_url: string | null; prep_minutes: number;
  is_available: boolean; track_stock: boolean; stock_qty: number;
  sort_order: number; created_at: string;
};

export type MenuItemOptionRow = {
  id: string; menu_item_id: string; group_name: string; option_name: string;
  price_delta: number; is_default: boolean; sort_order: number;
};

export type SupplierRow = {
  id: string; venue_id: string; name: string;
  contact_name: string | null; phone: string | null; email: string | null;
  created_at: string;
};

export type IngredientRow = {
  id: string; venue_id: string; supplier_id: string | null;
  name: string; unit: string; stock_qty: number;
  low_threshold: number; cost_per_unit: number; created_at: string;
};

export type RecipeLineRow = {
  id: string; menu_item_id: string; ingredient_id: string; qty_per_unit: number;
};

export type PurchaseOrderRow = {
  id: string; venue_id: string; supplier_id: string | null;
  status: PoStatus; total_cost: number;
  received_at: string | null; created_at: string;
};

export type PoLineRow = {
  id: string; purchase_order_id: string; ingredient_id: string;
  qty: number; unit_cost: number;
};

export type StockMovementRow = {
  id: string; venue_id: string; ingredient_id: string;
  delta: number; reason: StockReason; note: string | null; created_at: string;
};

export type FloorAreaRow = {
  id: string; venue_id: string; name: string; sort_order: number; created_at: string;
};

export type FloorObjectRow = {
  id: string; venue_id: string; area_id: string;
  kind: FloorObjectKind; shape: FloorObjectShape;
  label: string; seats: number;
  x: number; y: number; w: number; h: number; rotation: number; z: number;
  created_at: string;
};

export type TableSessionRow = {
  id: string; venue_id: string; table_object_id: string;
  customer_name: string; customer_phone: string;
  status: SessionStatus; opened_at: string; closed_at: string | null;
};

export type OrderRow = {
  id: string; venue_id: string; session_id: string; order_number: number;
  status: OrderStatus; placed_at: string;
  started_at: string | null; ready_at: string | null; delivered_at: string | null;
  target_minutes: number; total_amount: number; note: string | null;
};

export type OrderItemRow = {
  id: string; order_id: string; menu_item_id: string | null;
  name_snapshot: string; unit_price: number; qty: number;
  note: string | null; options_snapshot: OrderOptionSnapshot[];
};

export type AlertRow = {
  id: string; venue_id: string; alert_number: number;
  kind: AlertKind; ref_id: string | null; table_label: string | null;
  message: string; severity: AlertSeverity; is_read: boolean; created_at: string;
};

export type ContactMessageRow = {
  id: string; name: string; email: string;
  business_name: string | null; message: string; created_at: string;
};
```

### 1d. RPC input/output helper types

```ts
export interface PlaceOrderItemInput {
  menu_item_id: string;
  qty: number;
  note?: string;
  options?: OrderOptionSnapshot[];
}

export interface PlaceOrderResult {
  order: OrderRow;
  items: Array<{ menu_item_id: string; name: string; qty: number; unit_price: number }>;
}
```

### 1e. The `Database` interface — the part that breaks if you improvise

```ts
export interface Database {
  // REQUIRED. Without it this supabase-js version resolves its internal
  // generics to `never` and every query result becomes `never`. (Trap 4)
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    // MUST be Record<never, never>. Record<string, never> has an index
    // signature that collapses every table to `never`. (Trap 5)
    Views: Record<never, never>;
    Tables: {
      venues: Table<VenueRow,
        | "id" | "business_type" | "currency" | "logo_url" | "kitchen_label"
        | "sla_extra_item_minutes" | "sla_busy_factor" | "sla_amber_pct" | "sla_red_pct"
        | "next_order_number" | "next_alert_number" | "created_at">;
      profiles: Table<ProfileRow, "full_name" | "venue_id" | "created_at">;
      menu_categories: Table<MenuCategoryRow, "id" | "sort_order" | "is_active" | "created_at">;
      menu_items: Table<MenuItemRow,
        | "id" | "category_id" | "description" | "price" | "image_url" | "prep_minutes"
        | "is_available" | "track_stock" | "stock_qty" | "sort_order" | "created_at">;
      menu_item_options: Table<MenuItemOptionRow, "id" | "price_delta" | "is_default" | "sort_order">;
      suppliers: Table<SupplierRow, "id" | "contact_name" | "phone" | "email" | "created_at">;
      ingredients: Table<IngredientRow,
        "id" | "supplier_id" | "unit" | "stock_qty" | "low_threshold" | "cost_per_unit" | "created_at">;
      recipe_lines: Table<RecipeLineRow, "id" | "qty_per_unit">;
      purchase_orders: Table<PurchaseOrderRow,
        "id" | "supplier_id" | "status" | "total_cost" | "received_at" | "created_at">;
      po_lines: Table<PoLineRow, "id" | "qty" | "unit_cost">;
      stock_movements: Table<StockMovementRow, "id" | "note" | "created_at">;
      floor_areas: Table<FloorAreaRow, "id" | "name" | "sort_order" | "created_at">;
      floor_objects: Table<FloorObjectRow,
        "id" | "kind" | "shape" | "label" | "seats" | "x" | "y" | "w" | "h" | "rotation" | "z" | "created_at">;
      table_sessions: Table<TableSessionRow, "id" | "status" | "opened_at" | "closed_at">;
      orders: Table<OrderRow,
        | "id" | "status" | "placed_at" | "started_at" | "ready_at" | "delivered_at"
        | "target_minutes" | "total_amount" | "note">;
      order_items: Table<OrderItemRow, "id" | "menu_item_id" | "unit_price" | "qty" | "note" | "options_snapshot">;
      alerts: Table<AlertRow, "id" | "ref_id" | "table_label" | "severity" | "is_read" | "created_at">;
      contact_messages: Table<ContactMessageRow, "id" | "business_name" | "created_at">;
    };
    Functions: {
      claim_table: {
        Args: { p_venue_id: string; p_table_object_id: string; p_customer_name: string; p_customer_phone: string };
        Returns: TableSessionRow;
      };
      free_table: { Args: { p_session_id: string }; Returns: void };
      call_waiter: { Args: { p_session_id: string }; Returns: AlertRow };
      place_order: {
        Args: { p_session_id: string; p_items: PlaceOrderItemInput[]; p_note?: string | null };
        Returns: PlaceOrderResult;
      };
      advance_order_status: { Args: { p_order_id: string; p_new_status: OrderStatus }; Returns: OrderRow };
      create_venue_and_link_owner: {
        Args: { p_name: string; p_slug: string; p_business_type: BusinessType; p_currency: string };
        Returns: VenueRow;
      };
      check_late_orders: { Args: { p_venue_id: string }; Returns: number };
      receive_purchase_order: { Args: { p_po_id: string }; Returns: PurchaseOrderRow };
      apply_stock_take: {
        Args: { p_venue_id: string; p_counts: { ingredient_id: string; counted_qty: number }[] };
        Returns: number;
      };
    };
    Enums: {
      business_type: BusinessType;
      order_status: OrderStatus;
      po_status: PoStatus;
      stock_reason: StockReason;
      session_status: SessionStatus;
      alert_kind: AlertKind;
      alert_severity: AlertSeverity;
      floor_object_kind: FloorObjectKind;
      floor_object_shape: FloorObjectShape;
    };
  };
}
```

**Every RPC must be declared here.** Calling `supabase.rpc("name")` for one that is missing
is a type error, and adding it later means editing this frozen file.

### Verify before continuing

Create a scratch file, check it compiles, then delete it:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./lib/types";
const c = createClient<Database>("https://x.supabase.co", "k");
async function t() {
  const { data } = await c.from("venues").select("id").eq("slug", "x").maybeSingle();
  console.log(data?.id);   // must NOT error
}
```

If `data?.id` errors with "Property 'id' does not exist on type 'never'", you have hit
trap 4, 5, 6, or 7. Fix it now — everything downstream depends on this.

---

## 2. `lib/supabase/client.ts` — browser

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## 3. `lib/supabase/server.ts` — Server Components / Actions

Uses `createServerClient` from `@supabase/ssr` with the anon key, wired to Next's cookie
store. Requirements:

- `export async function createClient()` — async, because `cookies()` is async (Trap 2).
- `const cookieStore = await cookies();`
- `cookies: { getAll() {...}, setAll(cookiesToSet) {...} }`.
- Wrap the `setAll` body in `try {} catch {}` — it throws when called during a Server
  Component render, which is expected and safe to ignore because `proxy.ts` refreshes the
  session.

## 4. `lib/supabase/admin.ts` — service role

```ts
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Bypasses RLS entirely. Only import from Server Actions / Route Handlers.
 * Never a Client Component, never anything bundled for the browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

The `import "server-only"` line is load-bearing: it makes the build fail loudly if anyone
ever imports this into client code.

---

## 5. `lib/action-result.ts`

```ts
export type ActionResult<T extends object = Record<never, never>> =
  { error?: string } & Partial<T>;
```

See trap 9. Note `Record<never, never>`.

---

## 6. `lib/auth-helpers.ts`

```ts
import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireVenue() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("venue_id").eq("id", user.id).single();
  if (!profile?.venue_id) redirect("/onboarding");

  return { supabase, venueId: profile.venue_id, userId: user.id };
}
```

Every owner-side page and action starts with `const { supabase, venueId } = await requireVenue();`.

---

## 7. `lib/sla.ts`

Used by **both** people. Client-side elapsed/colour maths only — `target_minutes` always
comes from the order row (see `02-REFERENCE.md` §3).

Exports:

```ts
export type WaitLevel = "green" | "amber" | "red";

export interface WaitState {
  elapsedMinutes: number;
  remainingMinutes: number;
  pct: number;
  level: WaitLevel;
}

export function computeWaitState(params: {
  placedAt: string | Date;
  targetMinutes: number;
  amberPct?: number;   // default 0.7
  redPct?: number;     // default 1.0
  now?: Date;          // default new Date()
}): WaitState;

// "-2:35" for overdue, "4:05" for remaining
export function formatMinutesSeconds(minutes: number): string;
```

`computeWaitState` clamps `elapsedMinutes` at 0 minimum. `pct` is `elapsed / target`, or 0
when target is 0. `level` is red at `pct >= redPct`, amber at `pct >= amberPct`, else green.

---

## 8. Foundation checkpoint

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

All three must be clean.

```bash
git add -A
git commit -m "Foundation: setup, design system, shared types and clients"
git push -u origin main
```

**Both people pull now.** Then split per `01-TEAM-SPLIT-AND-GIT.md`:
Person A → `owner/A1-AUTH-ONBOARDING.md`, Person B → `customer/B1-SETUP-AND-CLAIM.md`.
