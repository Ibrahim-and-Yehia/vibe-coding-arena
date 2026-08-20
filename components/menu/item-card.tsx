"use client";

import { Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePicker } from "@/components/menu/image-picker";
import type { MenuItemRow } from "@/lib/types";

export function ItemCard({
  item,
  currency,
  onEdit,
  onDelete,
  onImageChange,
}: {
  item: MenuItemRow;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onImageChange: (url: string | null) => void;
}) {
  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <ImagePicker value={item.image_url} onChange={onImageChange} size="size-16" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{item.name}</div>
            {item.description && <div className="truncate text-sm text-muted-foreground">{item.description}</div>}
          </div>
          <div className="shrink-0 text-right font-medium">
            {currency} {item.price.toFixed(2)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" />
            {item.prep_minutes}m
          </Badge>
          {!item.is_available && <Badge variant="outline">Hidden</Badge>}
          {item.track_stock && (
            <Badge variant={item.stock_qty <= 0 ? "destructive" : "outline"}>
              {item.stock_qty <= 0 ? "Sold out" : `${item.stock_qty} left`}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
