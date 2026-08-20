import { requireVenue } from "@/lib/auth-helpers";
import { OrdersList } from "@/components/orders/orders-list";
import { OrdersTabs } from "@/components/orders/orders-tabs";
import { OrderHistoryTable, type HistoryRow } from "@/components/orders/order-history-table";

export default async function OrdersPage() {
  const { supabase, venueId } = await requireVenue();

  const [{ data: venue }, { data: historyOrders }] = await Promise.all([
    supabase.from("venues").select("currency").eq("id", venueId).single(),
    supabase
      .from("orders")
      .select("*")
      .eq("venue_id", venueId)
      .in("status", ["delivered", "cancelled"])
      .order("placed_at", { ascending: false })
      .limit(50),
  ]);

  const orders = historyOrders ?? [];
  let historyRows: HistoryRow[] = [];

  if (orders.length > 0) {
    const sessionIds = [...new Set(orders.map((o) => o.session_id))];
    const orderIds = orders.map((o) => o.id);

    const [{ data: sessions }, { data: orderItems }] = await Promise.all([
      supabase.from("table_sessions").select("*").in("id", sessionIds),
      supabase.from("order_items").select("order_id, qty").in("order_id", orderIds),
    ]);

    const tableObjectIds = [...new Set((sessions ?? []).map((s) => s.table_object_id))];
    const { data: floorObjects } =
      tableObjectIds.length > 0
        ? await supabase.from("floor_objects").select("id, label").in("id", tableObjectIds)
        : { data: [] };

    const itemCountByOrder = new Map<string, number>();
    for (const row of orderItems ?? []) {
      itemCountByOrder.set(row.order_id, (itemCountByOrder.get(row.order_id) ?? 0) + row.qty);
    }

    historyRows = orders.map((order) => {
      const session = sessions?.find((s) => s.id === order.session_id);
      const table = floorObjects?.find((f) => f.id === session?.table_object_id);
      return {
        ...order,
        tableLabel: table?.label ?? "—",
        customerName: session?.customer_name ?? "—",
        itemCount: itemCountByOrder.get(order.id) ?? 0,
      };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Every active order, numbered, with its countdown to target.</p>
      </div>
      <OrdersTabs
        live={<OrdersList />}
        history={<OrderHistoryTable rows={historyRows} currency={venue?.currency ?? "USD"} />}
      />
    </div>
  );
}
