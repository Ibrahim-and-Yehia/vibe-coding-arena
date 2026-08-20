"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CountdownRing, useNow, waitLevelFor } from "@/components/orders/countdown-ring";
import { OrderStatusButton } from "@/components/orders/order-status-buttons";
import { useLiveVenue } from "@/hooks/use-live-venue";
import { useVenue } from "@/components/dashboard/venue-context";
import { cn } from "@/lib/utils";
import type { LiveVenuePayload } from "@/lib/live-types";
import type { OrderStatus } from "@/lib/types";

const COLUMNS: { status: Extract<OrderStatus, "queued" | "preparing" | "ready">; label: string }[] = [
  { status: "queued", label: "In queue" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
];

function Ticket({ orderId, data, now }: { orderId: string; data: LiveVenuePayload; now: Date }) {
  const order = data.orders.find((o) => o.id === orderId)!;
  const items = data.orderItems.filter((i) => i.order_id === order.id);
  const session = data.sessions.find((s) => s.id === order.session_id);
  const table = data.objects.find((o) => o.id === session?.table_object_id);
  const level = waitLevelFor(order.placed_at, order.target_minutes, data.slaAmberPct, data.slaRedPct, now);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border-2 bg-card p-4",
        level === "red" && "border-status-red",
        level === "amber" && "border-status-amber",
        level === "green" && "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tabular-nums">#{order.order_number}</div>
          <div className="text-sm text-muted-foreground">
            Table {table?.label ?? "?"}
            {session && ` · ${session.customer_name}`}
          </div>
        </div>
        <CountdownRing
          placedAt={order.placed_at}
          targetMinutes={order.target_minutes}
          amberPct={data.slaAmberPct}
          redPct={data.slaRedPct}
          now={now}
          size={52}
        />
      </div>

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id} className="text-base leading-tight">
            <span className="font-bold tabular-nums">{item.qty}×</span> {item.name_snapshot}
            {item.options_snapshot.length > 0 && (
              <span className="block pl-6 text-sm text-muted-foreground">
                {item.options_snapshot.map((o) => o.option_name).join(", ")}
              </span>
            )}
            {item.note && <span className="block pl-6 text-sm italic text-status-amber">“{item.note}”</span>}
          </li>
        ))}
      </ul>

      {order.note && <p className="text-sm italic text-status-amber">Order note: {order.note}</p>}

      <OrderStatusButton orderId={order.id} status={order.status} size="default" className="w-full" />
    </div>
  );
}

export function KitchenDisplay() {
  const venue = useVenue();
  const { data, isLoading } = useLiveVenue(venue.id);
  const now = useNow();

  const byStatus = useMemo(() => {
    const map: Record<string, string[]> = { queued: [], preparing: [], ready: [] };
    for (const order of data?.orders ?? []) {
      if (map[order.status]) map[order.status].push(order.id);
    }
    return map;
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((c) => (
          <Skeleton key={c.status} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => (
        <div key={col.status} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{col.label}</h2>
            <Badge variant="secondary">{byStatus[col.status].length}</Badge>
          </div>
          {byStatus[col.status].length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Nothing here
            </div>
          ) : (
            byStatus[col.status].map((id) => <Ticket key={id} orderId={id} data={data} now={now} />)
          )}
        </div>
      ))}
    </div>
  );
}
