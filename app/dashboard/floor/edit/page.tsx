import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireVenue } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { FloorEditor } from "@/components/floor/floor-editor";
import type { FloorObjectRow } from "@/lib/types";

export default async function FloorEditPage() {
  const { supabase, venueId } = await requireVenue();

  const [{ data: venue }, { data: areas }, { data: objects }] = await Promise.all([
    supabase.from("venues").select("business_type").eq("id", venueId).single(),
    supabase.from("floor_areas").select("*").eq("venue_id", venueId).order("sort_order"),
    supabase.from("floor_objects").select("*").eq("venue_id", venueId).order("z"),
  ]);

  const objectsByArea: Record<string, FloorObjectRow[]> = {};
  for (const area of areas ?? []) {
    objectsByArea[area.id] = (objects ?? []).filter((o) => o.area_id === area.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Floor plan editor</h1>
          <p className="text-muted-foreground">Drag to move, corner handle to resize. Saved layout goes live.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/floor">
            <ArrowLeft className="size-4" />
            Live view
          </Link>
        </Button>
      </div>
      <FloorEditor
        areas={areas ?? []}
        objectsByArea={objectsByArea}
        businessType={venue?.business_type ?? "restaurant"}
      />
    </div>
  );
}
