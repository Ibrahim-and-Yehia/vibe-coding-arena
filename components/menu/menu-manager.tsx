"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategoryManagerDialog } from "@/components/menu/category-manager-dialog";
import { ItemDialog } from "@/components/menu/item-dialog";
import { ItemCard } from "@/components/menu/item-card";
import { deleteMenuItem, updateMenuItemImage } from "@/app/dashboard/menu/actions";
import type { MenuCategoryRow, MenuItemRow, MenuItemOptionRow, RecipeLineRow, IngredientRow } from "@/lib/types";

export function MenuManager({
  categories,
  items,
  options,
  recipeLines,
  ingredients,
  currency,
}: {
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
  options: MenuItemOptionRow[];
  recipeLines: RecipeLineRow[];
  ingredients: IngredientRow[];
  currency: string;
}) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItemRow | null>(null);

  const visibleItems = useMemo(
    () => items.filter((i) => i.category_id === activeCategory).sort((a, b) => a.sort_order - b.sort_order),
    [items, activeCategory]
  );

  function refresh() {
    router.refresh();
  }

  function openNewItem() {
    setEditingItem(null);
    setItemDialogOpen(true);
  }

  function openEditItem(item: MenuItemRow) {
    setEditingItem(item);
    setItemDialogOpen(true);
  }

  async function handleImageChange(itemId: string, url: string | null) {
    const result = await updateMenuItemImage(itemId, url);
    if (result?.error) toast.error(result.error);
    else refresh();
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    const result = await deleteMenuItem(deletingItem.id);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Item deleted");
      refresh();
    }
    setDeletingItem(null);
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No categories yet.</p>
        <Button onClick={() => setCategoryDialogOpen(true)}>
          <Plus className="size-4" />
          Add your first category
        </Button>
        <CategoryManagerDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          categories={categories}
          onSaved={refresh}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            {categories.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.name}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {items.filter((i) => i.category_id === c.id).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
            <Settings2 className="size-4" />
            Categories
          </Button>
          <Button onClick={openNewItem}>
            <Plus className="size-4" />
            Add item
          </Button>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No items in this category yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              currency={currency}
              onEdit={() => openEditItem(item)}
              onDelete={() => setDeletingItem(item)}
              onImageChange={(url) => handleImageChange(item.id, url)}
            />
          ))}
        </div>
      )}

      <CategoryManagerDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        onSaved={refresh}
      />

      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        defaultCategoryId={activeCategory}
        categories={categories}
        ingredients={ingredients}
        initialOptions={editingItem ? options.filter((o) => o.menu_item_id === editingItem.id) : []}
        initialRecipeLines={editingItem ? recipeLines.filter((r) => r.menu_item_id === editingItem.id) : []}
        currency={currency}
        onSaved={refresh}
      />

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the menu and any saved options or recipe. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
