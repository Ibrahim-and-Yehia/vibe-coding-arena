"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { upsertIngredient } from "@/app/dashboard/inventory/actions";
import type { IngredientRow, SupplierRow } from "@/lib/types";

const NO_SUPPLIER = "__none__";

const schema = z.object({
  name: z.string().min(1, "Required"),
  unit: z.string().min(1, "Required"),
  stock_qty: z.coerce.number().min(0),
  low_threshold: z.coerce.number().min(0),
  cost_per_unit: z.coerce.number().min(0),
  supplier_id: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function IngredientDialog({
  open,
  onOpenChange,
  ingredient,
  suppliers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: IngredientRow | null;
  suppliers: SupplierRow[];
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: ingredient?.name ?? "",
      unit: ingredient?.unit ?? "unit",
      stock_qty: ingredient?.stock_qty ?? 0,
      low_threshold: ingredient?.low_threshold ?? 0,
      cost_per_unit: ingredient?.cost_per_unit ?? 0,
      supplier_id: ingredient?.supplier_id ?? NO_SUPPLIER,
    });
  }, [open, ingredient, reset]);

  async function onSubmit(values: FormValues) {
    const result = await upsertIngredient({
      id: ingredient?.id,
      name: values.name,
      unit: values.unit,
      stock_qty: values.stock_qty,
      low_threshold: values.low_threshold,
      cost_per_unit: values.cost_per_unit,
      supplier_id: values.supplier_id === NO_SUPPLIER ? null : values.supplier_id,
    });
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Saved");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ingredient ? "Edit ingredient" : "Add ingredient"}</DialogTitle>
          <DialogDescription>Used by recipes to deduct stock automatically when items sell.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.unit}>
                <FieldLabel htmlFor="unit">Unit</FieldLabel>
                <Input id="unit" placeholder="kg, L, unit…" {...register("unit")} />
                <FieldError errors={[errors.unit]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="supplier_id">Supplier</FieldLabel>
                <Controller
                  control={control}
                  name="supplier_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="supplier_id" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SUPPLIER}>None</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field data-invalid={!!errors.stock_qty}>
                <FieldLabel htmlFor="stock_qty">Stock on hand</FieldLabel>
                <Input id="stock_qty" type="number" step="0.01" min="0" {...register("stock_qty")} />
              </Field>
              <Field data-invalid={!!errors.low_threshold}>
                <FieldLabel htmlFor="low_threshold">Low at</FieldLabel>
                <Input id="low_threshold" type="number" step="0.01" min="0" {...register("low_threshold")} />
              </Field>
              <Field data-invalid={!!errors.cost_per_unit}>
                <FieldLabel htmlFor="cost_per_unit">Cost / unit</FieldLabel>
                <Input id="cost_per_unit" type="number" step="0.0001" min="0" {...register("cost_per_unit")} />
              </Field>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
