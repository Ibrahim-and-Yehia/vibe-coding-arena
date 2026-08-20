"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createPurchaseOrder, type PurchaseOrderLineInput } from "@/app/dashboard/inventory/actions";
import type { IngredientRow, SupplierRow } from "@/lib/types";

const NO_SUPPLIER = "__none__";

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  suppliers,
  ingredients,
  currency,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: SupplierRow[];
  ingredients: IngredientRow[];
  currency: string;
  onSaved: () => void;
}) {
  const [supplierId, setSupplierId] = useState(NO_SUPPLIER);
  const [lines, setLines] = useState<PurchaseOrderLineInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSupplierId(NO_SUPPLIER);
    setLines([]);
  }

  async function handleCreate() {
    if (lines.length === 0) {
      toast.error("Add at least one line");
      return;
    }
    setSubmitting(true);
    const result = await createPurchaseOrder(supplierId === NO_SUPPLIER ? null : supplierId, lines);
    setSubmitting(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Purchase order created");
    reset();
    onOpenChange(false);
    onSaved();
  }

  const total = lines.reduce((sum, l) => sum + l.qty * l.unit_cost, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
          <DialogDescription>Draft it now, receive it later to bump stock automatically.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Supplier</FieldLabel>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full">
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
          </Field>

          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-center gap-2">
              <Select
                value={line.ingredient_id}
                onValueChange={(v) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ingredient_id: v } : l)))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Qty"
                value={line.qty}
                onChange={(e) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, qty: Number(e.target.value) } : l)))}
              />
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="Unit cost"
                value={line.unit_cost}
                onChange={(e) =>
                  setLines((prev) => prev.map((l, j) => (j === i ? { ...l, unit_cost: Number(e.target.value) } : l)))
                }
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={ingredients.length === 0}
            onClick={() => setLines((prev) => [...prev, { ingredient_id: ingredients[0]?.id ?? "", qty: 1, unit_cost: 0 }])}
          >
            <Plus className="size-4" />
            Add line
          </Button>

          {lines.length > 0 && (
            <div className="flex justify-between rounded-md border bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {currency} {total.toFixed(2)}
              </span>
            </div>
          )}

          <Button type="button" onClick={handleCreate} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create draft
          </Button>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}
