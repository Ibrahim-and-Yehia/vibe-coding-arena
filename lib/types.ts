// Hand-written to mirror supabase/migrations/0001_init.sql — no CLI/Docker
// available to generate this, so keep the two in sync when the schema changes.

export type BusinessType = "cafe" | "restaurant" | "bar";
export type OrderStatus = "queued" | "preparing" | "ready" | "delivered" | "cancelled";
export type PoStatus = "draft" | "ordered" | "received";
export type StockReason = "receive" | "sale" | "count" | "correction";
export type SessionStatus = "open" | "closed";
export type AlertKind = "new_order" | "order_ready" | "order_late" | "low_stock" | "call_waiter";
export type AlertSeverity = "info" | "warning" | "critical";
export type FloorObjectKind =
  | "table"
  | "kitchen"
  | "bar"
  | "pos"
  | "entrance"
  | "restroom"
  | "wall"
  | "plant"
  | "stairs"
  | "other";
export type FloorObjectShape = "round" | "square" | "rect" | "stool" | "line" | "rect_fixture";

export interface OrderOptionSnapshot {
  group_name: string;
  option_name: string;
  price_delta: number;
}

// Shape of postgrest-js's GenericRelationship, redeclared locally since it
// isn't a public export. Must be an array of objects with this shape, NOT
// `[]` or `unknown[]` — both make postgrest-js's result-type parser (which
// pattern-matches on `Relationships[number]`) collapse every query result
// to `never`. Cost real time to track down; do not "simplify" this away.
interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

// OptionalInsertKeys = columns with a DB default or that are nullable —
// callers may omit them on insert. Update always allows any non-id column
// (including server-managed timestamps like created_at/placed_at), since
// admin-side backdating for the seed script is a legitimate direct UPDATE.
interface Table<Row, OptionalInsertKeys extends keyof Row = never> {
  Row: Row;
  Insert: Omit<Row, OptionalInsertKeys> & Partial<Pick<Row, OptionalInsertKeys>>;
  Update: Partial<Omit<Row, "id">>;
  Relationships: Relationship[];
}

export type VenueRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  currency: string;
  logo_url: string | null;
  kitchen_label: string;
  sla_extra_item_minutes: number;
  sla_busy_factor: number;
  sla_amber_pct: number;
  sla_red_pct: number;
  next_order_number: number;
  next_alert_number: number;
  created_at: string;
}

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  venue_id: string | null;
  created_at: string;
}

export type MenuCategoryRow = {
  id: string;
  venue_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type MenuItemRow = {
  id: string;
  venue_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  prep_minutes: number;
  is_available: boolean;
  track_stock: boolean;
  stock_qty: number;
  sort_order: number;
  created_at: string;
}

export type MenuItemOptionRow = {
  id: string;
  menu_item_id: string;
  group_name: string;
  option_name: string;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
}

export type SupplierRow = {
  id: string;
  venue_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export type IngredientRow = {
  id: string;
  venue_id: string;
  supplier_id: string | null;
  name: string;
  unit: string;
  stock_qty: number;
  low_threshold: number;
  cost_per_unit: number;
  created_at: string;
}

export type RecipeLineRow = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  qty_per_unit: number;
}

export type PurchaseOrderRow = {
  id: string;
  venue_id: string;
  supplier_id: string | null;
  status: PoStatus;
  total_cost: number;
  received_at: string | null;
  created_at: string;
}

export type PoLineRow = {
  id: string;
  purchase_order_id: string;
  ingredient_id: string;
  qty: number;
  unit_cost: number;
}

export type StockMovementRow = {
  id: string;
  venue_id: string;
  ingredient_id: string;
  delta: number;
  reason: StockReason;
  note: string | null;
  created_at: string;
}

export type FloorAreaRow = {
  id: string;
  venue_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export type FloorObjectRow = {
  id: string;
  venue_id: string;
  area_id: string;
  kind: FloorObjectKind;
  shape: FloorObjectShape;
  label: string;
  seats: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
  created_at: string;
}

export type TableSessionRow = {
  id: string;
  venue_id: string;
  table_object_id: string;
  customer_name: string;
  customer_phone: string;
  status: SessionStatus;
  opened_at: string;
  closed_at: string | null;
}

export type OrderRow = {
  id: string;
  venue_id: string;
  session_id: string;
  order_number: number;
  status: OrderStatus;
  placed_at: string;
  started_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  target_minutes: number;
  total_amount: number;
  note: string | null;
}

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  unit_price: number;
  qty: number;
  note: string | null;
  options_snapshot: OrderOptionSnapshot[];
}

export type AlertRow = {
  id: string;
  venue_id: string;
  alert_number: number;
  kind: AlertKind;
  ref_id: string | null;
  table_label: string | null;
  message: string;
  severity: AlertSeverity;
  is_read: boolean;
  created_at: string;
}

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  business_name: string | null;
  message: string;
  created_at: string;
}

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

export interface Database {
  // Required by this supabase-js version's generic defaults (its
  // ClientOptions/SchemaName resolution silently falls through to `never`
  // without it) — mirrors what `supabase gen types` emits, even though we
  // hand-write this file since there's no CLI/DB access to generate it.
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    // NOT Record<string, never> — that has an index signature, which
    // collapses every table's type to `never` when the query builder
    // intersects `Tables & Views` to resolve a table/view name.
    Views: Record<never, never>;
    Tables: {
      venues: Table<
        VenueRow,
        | "id"
        | "business_type"
        | "currency"
        | "logo_url"
        | "kitchen_label"
        | "sla_extra_item_minutes"
        | "sla_busy_factor"
        | "sla_amber_pct"
        | "sla_red_pct"
        | "next_order_number"
        | "next_alert_number"
        | "created_at"
      >;
      profiles: Table<ProfileRow, "full_name" | "venue_id" | "created_at">;
      menu_categories: Table<MenuCategoryRow, "id" | "sort_order" | "is_active" | "created_at">;
      menu_items: Table<
        MenuItemRow,
        | "id"
        | "category_id"
        | "description"
        | "price"
        | "image_url"
        | "prep_minutes"
        | "is_available"
        | "track_stock"
        | "stock_qty"
        | "sort_order"
        | "created_at"
      >;
      menu_item_options: Table<MenuItemOptionRow, "id" | "price_delta" | "is_default" | "sort_order">;
      suppliers: Table<SupplierRow, "id" | "contact_name" | "phone" | "email" | "created_at">;
      ingredients: Table<
        IngredientRow,
        "id" | "supplier_id" | "unit" | "stock_qty" | "low_threshold" | "cost_per_unit" | "created_at"
      >;
      recipe_lines: Table<RecipeLineRow, "id" | "qty_per_unit">;
      purchase_orders: Table<
        PurchaseOrderRow,
        "id" | "supplier_id" | "status" | "total_cost" | "received_at" | "created_at"
      >;
      po_lines: Table<PoLineRow, "id" | "qty" | "unit_cost">;
      stock_movements: Table<StockMovementRow, "id" | "note" | "created_at">;
      floor_areas: Table<FloorAreaRow, "id" | "name" | "sort_order" | "created_at">;
      floor_objects: Table<
        FloorObjectRow,
        "id" | "kind" | "shape" | "label" | "seats" | "x" | "y" | "w" | "h" | "rotation" | "z" | "created_at"
      >;
      table_sessions: Table<TableSessionRow, "id" | "status" | "opened_at" | "closed_at">;
      orders: Table<
        OrderRow,
        | "id"
        | "status"
        | "placed_at"
        | "started_at"
        | "ready_at"
        | "delivered_at"
        | "target_minutes"
        | "total_amount"
        | "note"
      >;
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
