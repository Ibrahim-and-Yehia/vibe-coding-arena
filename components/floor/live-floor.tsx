"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FloorCanvas, type LiveTableInfo, type TableStatus } from "@/components/floor/floor-canvas";
import { TableDrawer } from "@/components/floor/table-drawer";
import { useNow, waitLevelFor } from "@/components/orders/countdown-ring";
import { useLiveVenue } from "@/hooks/use-live-venue";
import { useVenue } from "@/components/dashboard/venue-context";
import { cn } from "@/lib/utils";

const LEGEND: { status: TableStatus; label: string }[] = [
  { status: "free", label: "Free" },
  { status: "occupied", label: "Seated" },
  { status: "active", label: "Order active" },
  { status: "amber", label: "Running warm" },
  { status: "late", label: "Late" },
];

export function LiveFloor() {
  const venue = useVenue();
  const { data, isLoading } = useLiveVenue(venue.id);
  const now = useNow();
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const areaId = activeArea ?? data?.areas[0]?.id ?? "";

  const liveByTable = useMemo(() => {
    const map: Record<string, LiveTableInfo> = {};
    if (!data) return map;

    for (const obj of data.objects) {
      if (obj.kind !== "table") continue;
      const session = data.sessions.find((s) => s.table_object_id === obj.id);
      if (!session) {
        map[obj.id] = { status: "free", orderNumbers: [] };
        continue;
      }
      const orders = data.orders.filter((o) => o.session_id === session.id);
      let status: TableStatus = orders.length > 0 ? "active" : "occupied";
      for (const order of orders) {
        const level = waitLevelFor(order.placed_at, order.target_minutes, data.slaAmberPct, data.slaRedPct, now);
        if (level === "red") status = "late";
        else if (level === "amber" && status !== "late") status = "amber";
      }
      map[obj.id] = {
        status,
        orderNumbers: orders.map((o) => o.order_number),
        customerName: session.customer_name,
      };
    }
    return map;
  }, [data, now]);

  if (isLoading || !data) {
    return <Skeleton className="h-[420px] w-full rounded-lg" />;
  }

  const areaObjects = data.objects.filter((o) => o.area_id === areaId);
  const selectedTable = data.objects.find((o) => o.id === selectedTableId) ?? null;

  const seatedCount = data.sessions.length;
  const activeOrders = data.orders.length;
  const lateOrders = data.orders.filter(
    (o) => waitLevelFor(o.placed_at, o.target_minutes, data.slaAmberPct, data.slaRedPct, now) === "red"
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={areaId} onValueChange={setActiveArea}>
          <TabsList>
            {data.areas.map((a) => (
              <TabsTrigger key={a.id} value={a.id}>
                {a.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="size-3 animate-pulse text-status-free" />
            Live
          </span>
          <Button variant="outline" asChild>
            <Link href="/dashboard/floor/edit">
              <Pencil className="size-4" />
              Edit layout
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <strong>{seatedCount}</strong> <span className="text-muted-foreground">tables seated</span>
        </span>
        <span>
          <strong>{activeOrders}</strong> <span className="text-muted-foreground">active orders</span>
        </span>
        {lateOrders > 0 && (
          <span className="text-status-red">
            <strong>{lateOrders}</strong> running late
          </span>
        )}
      </div>

      <FloorCanvas objects={areaObjects} live={liveByTable} onTableClick={setSelectedTableId} />

      <div className="flex flex-wrap gap-4">
        {LEGEND.map(({ status, label }) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "size-3 rounded-full",
                status === "free" && "bg-status-free",
                status === "occupied" && "bg-status-occupied",
                status === "active" && "bg-status-active",
                status === "amber" && "bg-status-amber",
                status === "late" && "bg-status-red"
              )}
            />
            {label}
          </span>
        ))}
      </div>

      <TableDrawer table={selectedTable} data={data} now={now} onClose={() => setSelectedTableId(null)} />
    </div>
  );
}
