import Link from "next/link";
import { BookOpen, Map, Package, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("venue_id").eq("id", user!.id).single();
  const venueId = profile!.venue_id!;

  const [{ data: venue }, { count: itemCount }, { count: tableCount }, { count: ingredientCount }] =
    await Promise.all([
      supabase.from("venues").select("*").eq("id", venueId).single(),
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("venue_id", venueId),
      supabase
        .from("floor_objects")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", venueId)
        .eq("kind", "table"),
      supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("venue_id", venueId),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back{venue?.name ? `, ${venue.name}` : ""}</h1>
        <p className="text-muted-foreground">
          Live floor, order tracking, and analytics arrive as later phases build out. Here&apos;s what&apos;s
          on the books so far.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Menu items</CardDescription>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{itemCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Tables</CardDescription>
            <Map className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{tableCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Ingredients tracked</CardDescription>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{ingredientCount ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where to go next</CardTitle>
          <CardDescription>The starter content from setup is fully editable.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {[
            { href: "/dashboard/menu", label: "Review your menu and inventory" },
            { href: "/dashboard/floor", label: "Check your floor plan" },
            { href: "/dashboard/settings", label: "Grab your venue's ordering QR code" },
          ].map(({ href, label }) => (
            <Button key={href} asChild variant="ghost" className="justify-between">
              <Link href={href}>
                {label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
