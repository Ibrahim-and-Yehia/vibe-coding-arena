"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/action-result";
import type { PlaceOrderItemInput, PlaceOrderResult } from "@/lib/types";

// Customer-side writes run through the service role on the server: the
// customer isn't authenticated, and we never expose that key to the browser.

export async function claimTable(
  venueId: string,
  tableObjectId: string,
  customerName: string,
  customerPhone: string
): Promise<ActionResult<{ sessionId: string }>> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_table", {
    p_venue_id: venueId,
    p_table_object_id: tableObjectId,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
  });

  if (error) {
    if (error.message.includes("TABLE_TAKEN")) {
      return { error: "Someone just took that table — pick another one." };
    }
    return { error: error.message };
  }
  return { sessionId: data.id };
}

export async function placeOrder(
  sessionId: string,
  items: PlaceOrderItemInput[],
  note: string | null
): Promise<ActionResult<{ orderNumber: number; orderId: string }>> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("place_order", {
    p_session_id: sessionId,
    p_items: items,
    p_note: note,
  });

  if (error) {
    if (error.message.includes("SESSION_CLOSED")) {
      return { error: "This table was closed by staff. Please start again." };
    }
    return { error: error.message };
  }

  const result = data as unknown as PlaceOrderResult;
  return { orderNumber: result.order.order_number, orderId: result.order.id };
}

export async function callWaiter(sessionId: string): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("call_waiter", { p_session_id: sessionId });
  if (error) return { error: error.message };
  return {};
}

/** Live free/occupied tables plus session state, polled by the customer app. */
export async function getOrderingState(venueId: string, sessionId: string | null) {
  const admin = createAdminClient();

  const [{ data: objects }, { data: sessions }] = await Promise.all([
    admin.from("floor_objects").select("*").eq("venue_id", venueId).eq("kind", "table").order("label"),
    admin.from("table_sessions").select("*").eq("venue_id", venueId).eq("status", "open"),
  ]);

  const occupiedIds = new Set((sessions ?? []).map((s) => s.table_object_id));
  const session = sessionId ? (sessions ?? []).find((s) => s.id === sessionId) ?? null : null;

  let orders: Awaited<ReturnType<typeof fetchOrders>> = [];
  if (session) orders = await fetchOrders(session.id);

  return {
    tables: (objects ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      seats: o.seats,
      areaId: o.area_id,
      occupied: occupiedIds.has(o.id),
    })),
    session,
    orders,
  };
}

async function fetchOrders(sessionId: string) {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("*")
    .eq("session_id", sessionId)
    .order("order_number");
  const ids = (orders ?? []).map((o) => o.id);
  const { data: items } = ids.length
    ? await admin.from("order_items").select("*").in("order_id", ids)
    : { data: [] };

  return (orders ?? []).map((o) => ({
    ...o,
    items: (items ?? []).filter((i) => i.order_id === o.id),
  }));
}
