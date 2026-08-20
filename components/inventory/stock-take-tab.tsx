"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyStockTake } from "@/app/dashboard/inventory/actions";
import type { IngredientRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StockTakeTab({ ingredients }: { ingredients: IngredientRow[] }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(ingredients.map((i) => [i.id, i.stock_qty]))
  );
  const [submitting, setSubmitting] = useState(false);

  const changedCount = useMemo(
    () => ingredients.filter((i) => (counts[i.id] ?? i.stock_qty) !== i.stock_qty).length,
    [counts, ingredients]
  );

  async function handleApply() {
    setSubmitting(true);
    const payload = ingredients
      .filter((i) => (counts[i.id] ?? i.stock_qty) !== i.stock_qty)
      .map((i) => ({ ingredient_id: i.id, counted_qty: counts[i.id] }));
    const result = await applyStockTake(payload);
    setSubmitting(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Applied — ${result.updated ?? 0} ingredient(s) adjusted`);
    router.refresh();
  }

  if (ingredients.length === 0) {
    return <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">No ingredients to count yet.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Enter what you physically counted. Anything left unchanged is skipped.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ingredient</TableHead>
            <TableHead>System stock</TableHead>
            <TableHead className="w-32">Counted</TableHead>
            <TableHead className="w-24">Variance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((ing) => {
            const counted = counts[ing.id] ?? ing.stock_qty;
            const variance = counted - ing.stock_qty;
            return (
              <TableRow key={ing.id}>
                <TableCell className="font-medium">{ing.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {ing.stock_qty} {ing.unit}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={counted}
                    onChange={(e) => setCounts((prev) => ({ ...prev, [ing.id]: Number(e.target.value) }))}
                  />
                </TableCell>
                <TableCell className={cn(variance !== 0 && (variance > 0 ? "text-status-free" : "text-status-red"))}>
                  {variance !== 0 ? (variance > 0 ? `+${variance}` : variance) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Button className="w-fit" onClick={handleApply} disabled={submitting || changedCount === 0}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
        Apply stock take {changedCount > 0 && `(${changedCount} changed)`}
      </Button>
    </div>
  );
}
