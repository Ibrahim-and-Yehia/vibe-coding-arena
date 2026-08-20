"use server";

import { revalidatePath } from "next/cache";
import { requireVenue } from "@/lib/auth-helpers";
import { uploadImageToCloudinary, MAX_IMAGE_BYTES } from "@/lib/cloudinary";
import type { ActionResult } from "@/lib/action-result";

function fail(error: { message: string }): ActionResult {
  return { error: error.message };
}

// Auth-gated so the Cloudinary quota can't be hit by anyone but a signed-in
// owner — the customer-facing app never uploads images.
export async function uploadMenuItemImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const { venueId } = await requireVenue();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No image selected." };
  if (!file.type.startsWith("image/")) return { error: "Please choose an image file." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image must be under 5MB." };

  try {
    const url = await uploadImageToCloudinary(file, `serva/${venueId}/menu-items`);
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

// Quick photo swap straight from the menu grid, without opening the full
// item dialog — only the image changes, nothing else about the item.
export async function updateMenuItemImage(itemId: string, imageUrl: string | null): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("menu_items").update({ image_url: imageUrl }).eq("id", itemId);
  if (error) return fail(error);
  revalidatePath("/dashboard/menu");
  return {};
}

export async function createCategory(name: string): Promise<ActionResult> {
  const { supabase, venueId } = await requireVenue();
  const { count } = await supabase
    .from("menu_categories")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);
  const { error } = await supabase
    .from("menu_categories")
    .insert({ venue_id: venueId, name, sort_order: count ?? 0, is_active: true });
  if (error) return fail(error);
  revalidatePath("/dashboard/menu");
  return {};
}

export async function updateCategory(id: string, name: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("menu_categories").update({ name }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/dashboard/menu");
  return {};
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/dashboard/menu");
  return {};
}

export async function reorderCategories(orderedIds: string[]): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const results = await Promise.all(
    orderedIds.map((id, sort_order) => supabase.from("menu_categories").update({ sort_order }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(failed.error);
  revalidatePath("/dashboard/menu");
  return {};
}

export async function reorderMenuItems(orderedIds: string[]): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const results = await Promise.all(
    orderedIds.map((id, sort_order) => supabase.from("menu_items").update({ sort_order }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(failed.error);
  revalidatePath("/dashboard/menu");
  return {};
}

export interface MenuItemInput {
  id?: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  prep_minutes: number;
  image_url: string | null;
  is_available: boolean;
  track_stock: boolean;
  stock_qty: number;
}

export async function upsertMenuItem(input: MenuItemInput): Promise<ActionResult<{ id: string }>> {
  const { supabase, venueId } = await requireVenue();

  if (input.id) {
    const { error } = await supabase
      .from("menu_items")
      .update({
        category_id: input.category_id,
        name: input.name,
        description: input.description,
        price: input.price,
        prep_minutes: input.prep_minutes,
        image_url: input.image_url,
        is_available: input.is_available,
        track_stock: input.track_stock,
        stock_qty: input.stock_qty,
      })
      .eq("id", input.id);
    if (error) return fail(error);
    revalidatePath("/dashboard/menu");
    return { id: input.id };
  }

  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", input.category_id);

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      venue_id: venueId,
      category_id: input.category_id,
      name: input.name,
      description: input.description,
      price: input.price,
      prep_minutes: input.prep_minutes,
      image_url: input.image_url,
      is_available: input.is_available,
      track_stock: input.track_stock,
      stock_qty: input.stock_qty,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error) return fail(error);
  revalidatePath("/dashboard/menu");
  return { id: data.id };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/dashboard/menu");
  return {};
}

export interface MenuItemOptionInput {
  group_name: string;
  option_name: string;
  price_delta: number;
  is_default: boolean;
}

export async function saveMenuItemOptions(menuItemId: string, options: MenuItemOptionInput[]): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error: delErr } = await supabase.from("menu_item_options").delete().eq("menu_item_id", menuItemId);
  if (delErr) return fail(delErr);
  if (options.length > 0) {
    const { error } = await supabase.from("menu_item_options").insert(
      options.map((o, i) => ({
        menu_item_id: menuItemId,
        group_name: o.group_name,
        option_name: o.option_name,
        price_delta: o.price_delta,
        is_default: o.is_default,
        sort_order: i,
      }))
    );
    if (error) return fail(error);
  }
  revalidatePath("/dashboard/menu");
  return {};
}

export interface RecipeLineInput {
  ingredient_id: string;
  qty_per_unit: number;
}

export async function saveRecipeLines(menuItemId: string, lines: RecipeLineInput[]): Promise<ActionResult> {
  const { supabase } = await requireVenue();
  const { error: delErr } = await supabase.from("recipe_lines").delete().eq("menu_item_id", menuItemId);
  if (delErr) return fail(delErr);
  if (lines.length > 0) {
    const { error } = await supabase.from("recipe_lines").insert(
      lines.map((l) => ({ menu_item_id: menuItemId, ingredient_id: l.ingredient_id, qty_per_unit: l.qty_per_unit }))
    );
    if (error) return fail(error);
  }
  revalidatePath("/dashboard/menu");
  return {};
}
