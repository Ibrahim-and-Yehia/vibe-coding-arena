"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IngredientsTab } from "@/components/inventory/ingredients-tab";
import { SuppliersTab } from "@/components/inventory/suppliers-tab";
import { PurchaseOrdersTab } from "@/components/inventory/purchase-orders-tab";
import { StockTakeTab } from "@/components/inventory/stock-take-tab";
import type { IngredientRow, SupplierRow, PurchaseOrderRow, PoLineRow } from "@/lib/types";

export function InventoryManager({
  ingredients,
  suppliers,
  purchaseOrders,
  poLines,
  currency,
}: {
  ingredients: IngredientRow[];
  suppliers: SupplierRow[];
  purchaseOrders: PurchaseOrderRow[];
  poLines: PoLineRow[];
  currency: string;
}) {
  const lowStockCount = ingredients.filter((i) => i.stock_qty <= i.low_threshold).length;

  return (
    <Tabs defaultValue="ingredients">
      <TabsList>
        <TabsTrigger value="ingredients">
          Ingredients
          {lowStockCount > 0 && <span className="ml-1.5 text-xs text-status-amber">{lowStockCount} low</span>}
        </TabsTrigger>
        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        <TabsTrigger value="stock-take">Stock Take</TabsTrigger>
      </TabsList>
      <TabsContent value="ingredients" className="pt-4">
        <IngredientsTab ingredients={ingredients} suppliers={suppliers} />
      </TabsContent>
      <TabsContent value="suppliers" className="pt-4">
        <SuppliersTab suppliers={suppliers} />
      </TabsContent>
      <TabsContent value="purchase-orders" className="pt-4">
        <PurchaseOrdersTab
          purchaseOrders={purchaseOrders}
          poLines={poLines}
          ingredients={ingredients}
          suppliers={suppliers}
          currency={currency}
        />
      </TabsContent>
      <TabsContent value="stock-take" className="pt-4">
        <StockTakeTab ingredients={ingredients} />
      </TabsContent>
    </Tabs>
  );
}
