import { OrdersList } from "@/components/orders/orders-list";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Every active order, numbered, with its countdown to target.</p>
      </div>
      <OrdersList />
    </div>
  );
}
