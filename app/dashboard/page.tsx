import Link from "next/link";
import {
  BookOpen,
  Map as MapIcon,
  Package,
  ArrowRight,
  ShoppingBag,
  DollarSign,
  Timer,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OrderItemRow } from "@/lib/types";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("venue_id").eq("id", user!.id).single();
  const venueId = profile!.venue_id!;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { data: venue },
    { count: itemCount },
    { count: tableCount },
    { data: ingredients },
    { count: activeCount },
    { data: todaysOrders },
  ] = await Promise.all([
    supabase.from("venues").select("*").eq("id", venueId).single(),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("venue_id", venueId),
    supabase
      .from("floor_objects")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .eq("kind", "table"),
    supabase.from("ingredients").select("stock_qty, low_threshold").eq("venue_id", venueId),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .in("status", ["queued", "preparing", "ready"]),
    supabase
      .from("orders")
      .select("*")
      .eq("venue_id", venueId)
      .neq("status", "cancelled")
      .gte("placed_at", startOfToday.toISOString()),
  ]);

  const orders = todaysOrders ?? [];
  const orderCount = orders.length;
  const revenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const lowStockCount = (ingredients ?? []).filter((i) => i.stock_qty <= i.low_threshold).length;

  const delivered = orders.filter((o) => o.status === "delivered" && o.delivered_at);
  const onTimeCount = delivered.filter((o) => {
    const minutes = (new Date(o.delivered_at!).getTime() - new Date(o.placed_at).getTime()) / 60000;
    return minutes <= o.target_minutes;
  }).length;
  const onTimePct = delivered.length > 0 ? Math.round((onTimeCount / delivered.length) * 100) : null;

  let topItems: { name: string; qty: number }[] = [];
  if (orderCount > 0) {
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("*")
      .in(
        "order_id",
        orders.map((o) => o.id)
      );
    const tally = new Map<string, number>();
    for (const item of (orderItems ?? []) as OrderItemRow[]) {
      tally.set(item.name_snapshot, (tally.get(item.name_snapshot) ?? 0) + item.qty);
    }
    topItems = [...tally.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back{venue?.name ? `, ${venue.name}` : ""}</h1>
        <p className="text-muted-foreground">Today at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Orders today</CardDescription>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{orderCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Revenue today</CardDescription>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {venue?.currency} {revenue.toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>On time today</CardDescription>
            <Timer className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{onTimePct !== null ? `${onTimePct}%` : "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Active now</CardDescription>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{activeCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Low stock</CardDescription>
            <AlertTriangle className={`size-4 ${lowStockCount > 0 ? "text-status-amber" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{lowStockCount}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {topItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top sellers today</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                      {i + 1}
                    </span>
                    {item.name}
                  </span>
                  <span className="text-muted-foreground">{item.qty} sold</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Where to go next</CardTitle>
            <CardDescription>
              {itemCount ?? 0} menu items · {tableCount ?? 0} tables
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {[
              { href: "/dashboard/menu", label: "Review your menu and inventory", icon: BookOpen },
              { href: "/dashboard/floor", label: "Check your floor plan", icon: MapIcon },
              { href: "/dashboard/inventory", label: "Check stock levels", icon: Package },
            ].map(({ href, label, icon: Icon }) => (
              <Button key={href} asChild variant="ghost" className="justify-between">
                <Link href={href}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
