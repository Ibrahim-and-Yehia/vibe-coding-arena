"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountdownRing, useNow } from "@/components/orders/countdown-ring";
import { OrderStatusButton } from "@/components/orders/order-status-buttons";
import { useLiveVenue } from "@/hooks/use-live-venue";
import { useVenue } from "@/components/dashboard/venue-context";
import type { OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  queued: "In queue",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const FILTERS = [
  { value: "all", label: "All active" },
  { value: "queued", label: "In queue" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
] as const;

export function OrdersList() {
  const venue = useVenue();
  const { data, isLoading } = useLiveVenue(venue.id);
  const now = useNow();
  const [filter, setFilter] = useState<string>("all");

  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-lg" />;

  const orders = data.orders.filter((o) => filter === "all" || o.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No orders here right now.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead className="w-20">Timer</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const session = data.sessions.find((s) => s.id === order.session_id);
              const table = data.objects.find((o) => o.id === session?.table_object_id);
              const items = data.orderItems.filter((i) => i.order_id === order.id);
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold tabular-nums">{order.order_number}</TableCell>
                  <TableCell>
                    <CountdownRing
                      placedAt={order.placed_at}
                      targetMinutes={order.target_minutes}
                      amberPct={data.slaAmberPct}
                      redPct={data.slaRedPct}
                      now={now}
                      size={38}
                    />
                  </TableCell>
                  <TableCell>{table?.label ?? "—"}</TableCell>
                  <TableCell>
                    <div>{session?.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{session?.customer_phone}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {items.reduce((sum, i) => sum + i.qty, 0)} items
                  </TableCell>
                  <TableCell>
                    {data.currency} {order.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{STATUS_LABEL[order.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <OrderStatusButton orderId={order.id} status={order.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
