"use server";

import { revalidatePath } from "next/cache";
import { requireVenue } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/action-result";
import type { OrderStatus } from "@/lib/types";

function fail(error: { message: string }): ActionResult {
  return { error: error.message };
}

export async function advanceOrder(orderId: string, status: OrderStatus): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.rpc("advance_order_status", { p_order_id: orderId, p_new_status: status });
  if (error) return fail(error);
  revalidatePath("/dashboard/floor");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/kitchen");
  return {};
}

export async function freeTable(sessionId: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.rpc("free_table", { p_session_id: sessionId });
  if (error) return fail(error);
  revalidatePath("/dashboard/floor");
  return {};
}

export async function markAlertRead(alertId: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", alertId);
  if (error) return fail(error);
  return {};
}

export async function markAllAlertsRead(): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();
  const { error } = await supabase.from("alerts").update({ is_read: true }).eq("venue_id", venueId).eq("is_read", false);
  if (error) return fail(error);
  return {};
}
