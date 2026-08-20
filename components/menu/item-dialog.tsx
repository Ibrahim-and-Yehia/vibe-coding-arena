"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImagePicker } from "@/components/menu/image-picker";
import {
  upsertMenuItem,
  saveMenuItemOptions,
  saveRecipeLines,
  type MenuItemOptionInput,
  type RecipeLineInput,
} from "@/app/dashboard/menu/actions";
import type { MenuCategoryRow, MenuItemRow, MenuItemOptionRow, RecipeLineRow, IngredientRow } from "@/lib/types";

const detailsSchema = z.object({
  category_id: z.string().min(1, "Pick a category"),
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  prep_minutes: z.coerce.number().min(0),
  is_available: z.boolean(),
  track_stock: z.boolean(),
  stock_qty: z.coerce.number().min(0),
});
type DetailsValues = z.infer<typeof detailsSchema>;

export function ItemDialog({
  open,
  onOpenChange,
  item,
  defaultCategoryId,
  categories,
  ingredients,
  initialOptions,
  initialRecipeLines,
  currency,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItemRow | null;
  defaultCategoryId: string;
  categories: MenuCategoryRow[];
  ingredients: IngredientRow[];
  initialOptions: MenuItemOptionRow[];
  initialRecipeLines: RecipeLineRow[];
  currency: string;
  onSaved: () => void;
}) {
  const [activeItemId, setActiveItemId] = useState<string | null>(item?.id ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [options, setOptions] = useState<MenuItemOptionInput[]>([]);
  const [recipeLines, setRecipeLines] = useState<RecipeLineInput[]>([]);
  const [savingOptions, setSavingOptions] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(detailsSchema) });

  // Re-seed all local state when the dialog opens for a (possibly different)
  // item — done during render, not an effect, per React's guidance for
  // "adjusting state when a prop changes" rather than syncing with one.
  const openKey = open ? (item?.id ?? "new") : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (openKey !== null && openKey !== seededKey) {
    setSeededKey(openKey);
    setActiveItemId(item?.id ?? null);
    setImageUrl(item?.image_url ?? null);
    setOptions(
      initialOptions.map((o) => ({
        group_name: o.group_name,
        option_name: o.option_name,
        price_delta: o.price_delta,
        is_default: o.is_default,
      }))
    );
    setRecipeLines(initialRecipeLines.map((l) => ({ ingredient_id: l.ingredient_id, qty_per_unit: l.qty_per_unit })));
    reset({
      category_id: item?.category_id ?? defaultCategoryId,
      name: item?.name ?? "",
      description: item?.description ?? "",
      price: item?.price ?? 0,
      prep_minutes: item?.prep_minutes ?? 5,
      is_available: item?.is_available ?? true,
      track_stock: item?.track_stock ?? false,
      stock_qty: item?.stock_qty ?? 0,
    });
  }

  async function onSubmitDetails(values: DetailsValues) {
    const result = await upsertMenuItem({
      id: activeItemId ?? undefined,
      category_id: values.category_id,
      name: values.name,
      description: values.description || null,
      price: values.price,
      prep_minutes: values.prep_minutes,
      image_url: imageUrl,
      is_available: values.is_available,
      track_stock: values.track_stock,
      stock_qty: values.stock_qty,
    });
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    if (result?.id) setActiveItemId(result.id);
    toast.success("Saved");
    onSaved();
  }

  async function persistOptions() {
    if (!activeItemId) return;
    setSavingOptions(true);
    const result = await saveMenuItemOptions(activeItemId, options);
    setSavingOptions(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Options saved");
    onSaved();
  }

  async function persistRecipe() {
    if (!activeItemId) return;
    setSavingRecipe(true);
    const result = await saveRecipeLines(activeItemId, recipeLines);
    setSavingRecipe(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Recipe saved");
    onSaved();
  }

  const livePrice = useWatch({ control, name: "price" });
  const cost = recipeLines.reduce((sum, line) => {
    const ing = ingredients.find((i) => i.id === line.ingredient_id);
    return sum + (ing ? ing.cost_per_unit * line.qty_per_unit : 0);
  }, 0);
  const price = Number(livePrice ?? item?.price ?? 0);
  const margin = price > 0 ? ((price - cost) / price) * 100 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add menu item"}</DialogTitle>
          <DialogDescription>Details, options, and a recipe for cost tracking.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="options" disabled={!activeItemId}>
              Options
            </TabsTrigger>
            <TabsTrigger value="recipe" disabled={!activeItemId}>
              Recipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={handleSubmit(onSubmitDetails)}>
              <FieldGroup>
                <div className="flex items-center gap-4">
                  <ImagePicker value={imageUrl} onChange={setImageUrl} size="size-20" />
                  <p className="text-sm text-muted-foreground">
                    Click the square to {imageUrl ? "change" : "add"} a photo. JPG or PNG, up to 5MB.
                  </p>
                </div>

                <Field data-invalid={!!errors.category_id}>
                  <FieldLabel htmlFor="category_id">Category</FieldLabel>
                  <Controller
                    control={control}
                    name="category_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="category_id" className="w-full">
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[errors.category_id]} />
                </Field>

                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" {...register("name")} />
                  <FieldError errors={[errors.name]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea id="description" rows={2} {...register("description")} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={!!errors.price}>
                    <FieldLabel htmlFor="price">Price ({currency})</FieldLabel>
                    <Input id="price" type="number" step="0.01" min="0" {...register("price")} />
                    <FieldError errors={[errors.price]} />
                  </Field>
                  <Field data-invalid={!!errors.prep_minutes}>
                    <FieldLabel htmlFor="prep_minutes">Prep time (min)</FieldLabel>
                    <Input id="prep_minutes" type="number" step="1" min="0" {...register("prep_minutes")} />
                    <FieldError errors={[errors.prep_minutes]} />
                  </Field>
                </div>

                <Field orientation="horizontal">
                  <FieldLabel htmlFor="is_available">Available on menu</FieldLabel>
                  <Controller
                    control={control}
                    name="is_available"
                    render={({ field }) => <Switch id="is_available" checked={field.value} onCheckedChange={field.onChange} />}
                  />
                </Field>

                <Field orientation="horizontal">
                  <FieldLabel htmlFor="track_stock">Track stock for this item</FieldLabel>
                  <Controller
                    control={control}
                    name="track_stock"
                    render={({ field }) => <Switch id="track_stock" checked={field.value} onCheckedChange={field.onChange} />}
                  />
                </Field>

                <Controller
                  control={control}
                  name="track_stock"
                  render={({ field }) =>
                    field.value ? (
                      <Field>
                        <FieldLabel htmlFor="stock_qty">Stock on hand</FieldLabel>
                        <Input id="stock_qty" type="number" step="1" min="0" {...register("stock_qty")} />
                        <FieldDescription>Sold out items grey out automatically on the customer menu.</FieldDescription>
                      </Field>
                    ) : (
                      <></>
                    )
                  }
                />

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {activeItemId ? "Save details" : "Create item"}
                </Button>
              </FieldGroup>
            </form>
          </TabsContent>

          <TabsContent value="options" className="flex flex-col gap-3">
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No options yet — e.g. a &quot;Doneness&quot; group with Rare / Medium / Well.
              </p>
            )}
            {options.map((opt, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_5rem_auto] items-center gap-2">
                <Input
                  placeholder="Group (e.g. Size)"
                  value={opt.group_name}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, group_name: e.target.value } : o)))
                  }
                />
                <Input
                  placeholder="Option (e.g. Large)"
                  value={opt.option_name}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, option_name: e.target.value } : o)))
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="+0.00"
                  value={opt.price_delta}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((o, j) => (j === i ? { ...o, price_delta: Number(e.target.value) } : o))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setOptions((prev) => [...prev, { group_name: "", option_name: "", price_delta: 0, is_default: false }])}
            >
              <Plus className="size-4" />
              Add option
            </Button>
            <Button type="button" onClick={persistOptions} disabled={savingOptions} className="w-fit">
              {savingOptions && <Loader2 className="size-4 animate-spin" />}
              Save options
            </Button>
          </TabsContent>

          <TabsContent value="recipe" className="flex flex-col gap-3">
            {ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add ingredients in Inventory first to build a recipe.</p>
            ) : (
              <>
                {recipeLines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
                    <Select
                      value={line.ingredient_id}
                      onValueChange={(v) =>
                        setRecipeLines((prev) => prev.map((l, j) => (j === i ? { ...l, ingredient_id: v } : l)))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.qty_per_unit}
                      onChange={(e) =>
                        setRecipeLines((prev) =>
                          prev.map((l, j) => (j === i ? { ...l, qty_per_unit: Number(e.target.value) } : l))
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setRecipeLines((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    setRecipeLines((prev) => [...prev, { ingredient_id: ingredients[0].id, qty_per_unit: 0 }])
                  }
                >
                  <Plus className="size-4" />
                  Add ingredient
                </Button>

                {recipeLines.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-md border bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost per dish</span>
                      <span className="font-medium">
                        {currency} {cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin at current price</span>
                      <span className={"font-medium " + (margin !== null && margin < 0 ? "text-destructive" : "")}>
                        {margin !== null ? `${margin.toFixed(0)}%` : "—"}
                      </span>
                    </div>
                  </div>
                )}

                <Button type="button" onClick={persistRecipe} disabled={savingRecipe} className="w-fit">
                  {savingRecipe && <Loader2 className="size-4 animate-spin" />}
                  Save recipe
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
