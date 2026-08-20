import { requireVenue } from "@/lib/auth-helpers";
import { MenuManager } from "@/components/menu/menu-manager";

export default async function MenuPage() {
  const { supabase, venueId } = await requireVenue();

  const [{ data: venue }, { data: categories }, { data: items }, { data: options }, { data: recipeLines }, { data: ingredients }] =
    await Promise.all([
      supabase.from("venues").select("currency").eq("id", venueId).single(),
      supabase.from("menu_categories").select("*").eq("venue_id", venueId).order("sort_order"),
      supabase.from("menu_items").select("*").eq("venue_id", venueId).order("sort_order"),
      supabase.from("menu_item_options").select("*"),
      supabase.from("recipe_lines").select("*"),
      supabase.from("ingredients").select("*").eq("venue_id", venueId).order("name"),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
        <p className="text-muted-foreground">Categories, items, options, and recipes.</p>
      </div>
      <MenuManager
        categories={categories ?? []}
        items={items ?? []}
        options={options ?? []}
        recipeLines={recipeLines ?? []}
        ingredients={ingredients ?? []}
        currency={venue?.currency ?? "USD"}
      />
    </div>
  );
}
