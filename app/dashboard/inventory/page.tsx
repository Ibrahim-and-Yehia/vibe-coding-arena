import { requireVenue } from "@/lib/auth-helpers";
import { InventoryManager } from "@/components/inventory/inventory-manager";

export default async function InventoryPage() {
  const { supabase, venueId } = await requireVenue();

  const [{ data: venue }, { data: ingredients }, { data: suppliers }, { data: purchaseOrders }, { data: poLines }] =
    await Promise.all([
      supabase.from("venues").select("currency").eq("id", venueId).single(),
      supabase.from("ingredients").select("*").eq("venue_id", venueId).order("name"),
      supabase.from("suppliers").select("*").eq("venue_id", venueId).order("name"),
      supabase.from("purchase_orders").select("*").eq("venue_id", venueId).order("created_at", { ascending: false }),
      supabase.from("po_lines").select("*"),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">Ingredients, suppliers, purchase orders, and stock takes.</p>
      </div>
      <InventoryManager
        ingredients={ingredients ?? []}
        suppliers={suppliers ?? []}
        purchaseOrders={purchaseOrders ?? []}
        poLines={poLines ?? []}
        currency={venue?.currency ?? "USD"}
      />
    </div>
  );
}
