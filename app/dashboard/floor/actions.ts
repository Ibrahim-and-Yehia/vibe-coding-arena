"use server";

import { revalidatePath } from "next/cache";
import { requireVenue } from "@/lib/auth-helpers";
import type { ActionResult } from "@/lib/action-result";
import type { EditableObject } from "@/lib/floor";
import { BUSINESS_PRESETS } from "@/lib/presets";
import type { BusinessType } from "@/lib/types";

function fail(error: { message: string }): ActionResult {
  return { error: error.message };
}

export async function saveFloorArea(
  areaId: string,
  objects: EditableObject[],
  deletedIds: string[]
): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();

  if (deletedIds.length > 0) {
    const { error } = await supabase.from("floor_objects").delete().in("id", deletedIds).eq("venue_id", venueId);
    if (error) return fail(error);
  }

  // Drafts carry a client-generated uuid; upsert handles both new and existing.
  const rows = objects.map((o, i) => ({
    id: o.id,
    venue_id: venueId,
    area_id: areaId,
    kind: o.kind,
    shape: o.shape,
    label: o.label,
    seats: o.seats,
    x: o.x,
    y: o.y,
    w: o.w,
    h: o.h,
    rotation: o.rotation,
    z: i,
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from("floor_objects").upsert(rows);
    if (error) return fail(error);
  }

  revalidatePath("/dashboard/floor");
  revalidatePath("/dashboard/floor/edit");
  return {};
}

export async function createArea(name: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, venueId } = await requireVenue();
  const { count } = await supabase
    .from("floor_areas")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);
  const { data, error } = await supabase
    .from("floor_areas")
    .insert({ venue_id: venueId, name, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error) return fail(error);
  revalidatePath("/dashboard/floor/edit");
  return { id: data.id };
}

export async function renameArea(id: string, name: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("floor_areas").update({ name }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/dashboard/floor/edit");
  return {};
}

export async function deleteArea(id: string): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();
  const { count } = await supabase
    .from("floor_areas")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);
  if ((count ?? 0) <= 1) return { error: "You need at least one area." };
  const { error } = await supabase.from("floor_areas").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/dashboard/floor/edit");
  return {};
}

/** Replace an area's contents with a starter template for the venue's type. */
export async function applyTemplate(areaId: string, businessType: BusinessType): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();
  const preset = BUSINESS_PRESETS[businessType];

  const { error: delError } = await supabase.from("floor_objects").delete().eq("area_id", areaId);
  if (delError) return fail(delError);

  // Templates are authored per-area in presets; take the first area's layout.
  const firstAreaName = preset.areas[0];
  const objects = preset.floorObjects.filter((o) => o.area === firstAreaName);

  const { error } = await supabase.from("floor_objects").insert(
    objects.map((o, i) => ({
      venue_id: venueId,
      area_id: areaId,
      kind: o.kind,
      shape: o.shape,
      label: o.label,
      seats: o.seats,
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      z: i,
    }))
  );
  if (error) return fail(error);

  revalidatePath("/dashboard/floor/edit");
  return {};
}
