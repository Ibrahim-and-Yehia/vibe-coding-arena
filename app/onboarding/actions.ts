"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { BUSINESS_PRESETS } from "@/lib/presets";
import type { BusinessType } from "@/lib/types";

export interface CreateVenueInput {
  name: string;
  businessType: BusinessType;
  currency: string;
  /**
   * When true the venue is created completely empty — no starter menu, no
   * floor plan. The owner builds everything themselves. A single "Main Area"
   * is still created because the floor editor needs at least one area to
   * draw into.
   */
  startEmpty?: boolean;
}

export async function createVenueAction(input: CreateVenueInput): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const preset = BUSINESS_PRESETS[input.businessType];
  const baseSlug = slugify(input.name);

  let venueId: string | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data, error } = await supabase.rpc("create_venue_and_link_owner", {
      p_name: input.name,
      p_slug: slug,
      p_business_type: input.businessType,
      p_currency: input.currency,
    });
    if (!error && data) {
      venueId = data.id;
      break;
    }
    if (error?.code === "23505") {
      lastError = "That venue name is already taken — try a more specific one.";
      continue;
    }
    if (error) return { error: error.message };
  }

  if (!venueId) return { error: lastError ?? "Could not create your venue. Please try again." };

  if (preset.kitchenLabel !== "Kitchen") {
    await supabase.from("venues").update({ kitchen_label: preset.kitchenLabel }).eq("id", venueId);
  }

  if (input.startEmpty) {
    // Floor editor needs somewhere to draw, so give it one empty area and stop.
    await supabase.from("floor_areas").insert({ venue_id: venueId, name: "Main Area", sort_order: 0 });
    redirect("/dashboard");
  }

  const { data: categories } = await supabase
    .from("menu_categories")
    .insert(preset.categories.map((name, i) => ({ venue_id: venueId!, name, sort_order: i })))
    .select();

  if (categories) {
    const catId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
    await supabase.from("menu_items").insert(
      preset.items
        .map((item, i) => ({
          venue_id: venueId!,
          category_id: catId(item.category),
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          prep_minutes: item.prepMinutes,
          sort_order: i,
        }))
        .filter((row) => row.category_id !== null)
    );
  }

  const { data: areas } = await supabase
    .from("floor_areas")
    .insert(preset.areas.map((name, i) => ({ venue_id: venueId!, name, sort_order: i })))
    .select();

  if (areas) {
    const areaId = (name: string) => areas.find((a) => a.name === name)?.id;
    await supabase.from("floor_objects").insert(
      preset.floorObjects.flatMap((o, i) => {
        const area_id = areaId(o.area);
        if (!area_id) return [];
        return [
          {
            venue_id: venueId!,
            area_id,
            kind: o.kind,
            shape: o.shape,
            label: o.label,
            seats: o.seats,
            x: o.x,
            y: o.y,
            w: o.w,
            h: o.h,
            z: i,
          },
        ];
      })
    );
  }

  redirect("/dashboard");
}
