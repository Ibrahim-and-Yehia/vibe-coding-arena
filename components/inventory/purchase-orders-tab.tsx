"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PurchaseOrderDialog } from "@/components/inventory/purchase-order-dialog";
import { updatePurchaseOrderStatus, deletePurchaseOrder } from "@/app/dashboard/inventory/actions";
import type { PurchaseOrderRow, PoLineRow, IngredientRow, SupplierRow } from "@/lib/types";

const STATUS_LABEL: Record<PurchaseOrderRow["status"], string> = {
  draft: "Draft",
  ordered: "Ordered",
  received: "Received",
};

export function PurchaseOrdersTab({
  purchaseOrders,
  poLines,
  ingredients,
  suppliers,
  currency,
}: {
  purchaseOrders: PurchaseOrderRow[];
  poLines: PoLineRow[];
  ingredients: IngredientRow[];
  suppliers: SupplierRow[];
  currency: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  const ingredientName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? "Unknown";
  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "No supplier";
  const linesFor = (poId: string) => poLines.filter((l) => l.purchase_order_id === poId);

  async function advance(po: PurchaseOrderRow, status: "ordered" | "received") {
    setBusyId(po.id);
    const result = await updatePurchaseOrderStatus(po.id, status);
    setBusyId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(status === "received" ? "Stock updated from PO" : "Marked as ordered");
    refresh();
  }

  async function remove(po: PurchaseOrderRow) {
    setBusyId(po.id);
    const result = await deletePurchaseOrder(po.id);
    setBusyId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Draft deleted");
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} disabled={ingredients.length === 0}>
          <Plus className="size-4" />
          New purchase order
        </Button>
      </div>

      {purchaseOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          No purchase orders yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {purchaseOrders.map((po) => (
            <Card key={po.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Package className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium">{supplierName(po.supplier_id)}</div>
                    <div className="text-xs text-muted-foreground">
                      {currency} {po.total_cost.toFixed(2)} · {linesFor(po.id).length} line
                      {linesFor(po.id).length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={po.status === "received" ? "default" : po.status === "ordered" ? "secondary" : "outline"}
                >
                  {STATUS_LABEL[po.status]}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {linesFor(po.id).map((line) => (
                    <li key={line.id} className="flex justify-between">
                      <span>{ingredientName(line.ingredient_id)}</span>
                      <span>
                        {line.qty} × {currency} {line.unit_cost.toFixed(4)}
                      </span>
                    </li>
                  ))}
                </ul>
                {po.status !== "received" && (
                  <div className="flex gap-2">
                    {po.status === "draft" && (
                      <>
                        <Button size="sm" disabled={busyId === po.id} onClick={() => advance(po, "ordered")}>
                          Mark ordered
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === po.id} onClick={() => remove(po)}>
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </>
                    )}
                    {po.status === "ordered" && (
                      <Button size="sm" disabled={busyId === po.id} onClick={() => advance(po, "received")}>
                        Receive — updates stock
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PurchaseOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        suppliers={suppliers}
        ingredients={ingredients}
        currency={currency}
        onSaved={refresh}
      />
    </div>
  );
}
