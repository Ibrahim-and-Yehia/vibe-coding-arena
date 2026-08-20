"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { IngredientDialog } from "@/components/inventory/ingredient-dialog";
import { deleteIngredient } from "@/app/dashboard/inventory/actions";
import type { IngredientRow, SupplierRow } from "@/lib/types";

export function IngredientsTab({ ingredients, suppliers }: { ingredients: IngredientRow[]; suppliers: SupplierRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IngredientRow | null>(null);
  const [deleting, setDeleting] = useState<IngredientRow | null>(null);

  function refresh() {
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteIngredient(deleting.id);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Ingredient deleted");
      refresh();
    }
    setDeleting(null);
  }

  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add ingredient
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No ingredients yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Low at</TableHead>
              <TableHead>Cost / unit</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map((ing) => {
              const low = ing.stock_qty <= ing.low_threshold;
              return (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {low && <AlertTriangle className="size-3.5 text-status-amber" />}
                      {ing.stock_qty} {ing.unit}
                      {low && (
                        <Badge variant="outline" className="ml-1 border-status-amber text-status-amber">
                          Low
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ing.low_threshold} {ing.unit}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ing.cost_per_unit.toFixed(4)}</TableCell>
                  <TableCell className="text-muted-foreground">{supplierName(ing.supplier_id)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(ing);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(ing)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <IngredientDialog open={dialogOpen} onOpenChange={setDialogOpen} ingredient={editing} suppliers={suppliers} onSaved={refresh} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Any recipes using this ingredient will lose that line. This can&apos;t be undone.
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
