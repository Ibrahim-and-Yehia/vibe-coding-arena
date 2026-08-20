"use server";

import { revalidatePath } from "next/cache";
import { requireVenue } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/action-result";
import type { PoStatus } from "@/lib/types";

function fail(error: { message: string }): ActionResult {
  return { error: error.message };
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
export interface SupplierInput {
  id?: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
}

export async function upsertSupplier(input: SupplierInput): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();
  if (input.id) {
    const { error } = await supabase
      .from("suppliers")
      .update({ name: input.name, contact_name: input.contact_name, phone: input.phone, email: input.email })
      .eq("id", input.id);
    if (error) return fail(error);
  } else {
    const { error } = await supabase.from("suppliers").insert({ venue_id: venueId, ...input });
    if (error) return fail(error);
  }
  revalidatePath("/dashboard/inventory");
  return {};
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/dashboard/inventory");
  return {};
}

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------
export interface IngredientInput {
  id?: string;
  name: string;
  unit: string;
  stock_qty: number;
  low_threshold: number;
  cost_per_unit: number;
  supplier_id: string | null;
}

export async function upsertIngredient(input: IngredientInput): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from("ingredients").update(rest).eq("id", id);
    if (error) return fail(error);
  } else {
    const { error } = await supabase.from("ingredients").insert({ venue_id: venueId, ...input });
    if (error) return fail(error);
  }
  revalidatePath("/dashboard/inventory");
  return {};
}

export async function deleteIngredient(id: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/dashboard/inventory");
  return {};
}

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------
export interface PurchaseOrderLineInput {
  ingredient_id: string;
  qty: number;
  unit_cost: number;
}

export async function createPurchaseOrder(
  supplierId: string | null,
  lines: PurchaseOrderLineInput[]
): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();
  const totalCost = lines.reduce((sum, l) => sum + l.qty * l.unit_cost, 0);

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({ venue_id: venueId, supplier_id: supplierId, status: "draft", total_cost: totalCost })
    .select("id")
    .single();
  if (error) return fail(error);

  const { error: linesError } = await supabase
    .from("po_lines")
    .insert(lines.map((l) => ({ purchase_order_id: po.id, ingredient_id: l.ingredient_id, qty: l.qty, unit_cost: l.unit_cost })));
  if (linesError) return fail(linesError);

  revalidatePath("/dashboard/inventory");
  return {};
}

export async function updatePurchaseOrderStatus(id: string, status: PoStatus): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  if (status === "received") {
    const { error } = await supabase.rpc("receive_purchase_order", { p_po_id: id });
    if (error) return fail(error);
  } else {
    const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", id);
    if (error) return fail(error);
  }
  revalidatePath("/dashboard/inventory");
  return {};
}

export async function deletePurchaseOrder(id: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id).eq("status", "draft");
  if (error) return fail(error);
  revalidatePath("/dashboard/inventory");
  return {};
}

// ---------------------------------------------------------------------------
// Stock take
// ---------------------------------------------------------------------------
export async function applyStockTake(
  counts: { ingredient_id: string; counted_qty: number }[]
): Promise<ActionResult<{ updated: number }>> {
  const { supabase, venueId } = await requireVenue();
  const { data, error } = await supabase.rpc("apply_stock_take", { p_venue_id: venueId, p_counts: counts });
  if (error) return fail(error);
  revalidatePath("/dashboard/inventory");
  return { updated: data ?? 0 };
}
