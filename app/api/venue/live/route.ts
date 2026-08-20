import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LiveVenuePayload } from "@/lib/live-types";

// Single aggregate endpoint the dashboard polls every ~2s. Scoped to the
// signed-in owner's venue via RLS, so no venue id comes from the client.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("venue_id").eq("id", user.id).single();
  const venueId = profile?.venue_id;
  if (!venueId) return NextResponse.json({ error: "no venue" }, { status: 404 });

  // Surface any newly-late orders before reading alerts back.
  await supabase.rpc("check_late_orders", { p_venue_id: venueId });

  const [{ data: venue }, { data: areas }, { data: objects }, { data: sessions }, { data: orders }, { data: alerts }] =
    await Promise.all([
      supabase.from("venues").select("sla_amber_pct, sla_red_pct, currency, kitchen_label").eq("id", venueId).single(),
      supabase.from("floor_areas").select("*").eq("venue_id", venueId).order("sort_order"),
      supabase.from("floor_objects").select("*").eq("venue_id", venueId).order("z"),
      supabase.from("table_sessions").select("*").eq("venue_id", venueId).eq("status", "open"),
      supabase
        .from("orders")
        .select("*")
        .eq("venue_id", venueId)
        .in("status", ["queued", "preparing", "ready"])
        .order("order_number"),
      supabase.from("alerts").select("*").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(50),
    ]);

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: orderItems } = orderIds.length
    ? await supabase.from("order_items").select("*").in("order_id", orderIds)
    : { data: [] };

  const payload: LiveVenuePayload = {
    areas: areas ?? [],
    objects: objects ?? [],
    sessions: sessions ?? [],
    orders: orders ?? [],
    orderItems: orderItems ?? [],
    alerts: alerts ?? [],
    slaAmberPct: venue?.sla_amber_pct ?? 0.7,
    slaRedPct: venue?.sla_red_pct ?? 1.0,
    currency: venue?.currency ?? "USD",
    kitchenLabel: venue?.kitchen_label ?? "Kitchen",
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
