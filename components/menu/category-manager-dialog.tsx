"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createCategory, updateCategory, deleteCategory, reorderCategories } from "@/app/dashboard/menu/actions";
import type { MenuCategoryRow } from "@/lib/types";

export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategoryRow[];
  onSaved: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const result = await createCategory(newName.trim());
    setAdding(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setNewName("");
    onSaved();
  }

  async function handleRename(id: string, name: string) {
    const result = await updateCategory(id, name);
    if (result?.error) toast.error(result.error);
    else onSaved();
  }

  async function handleDelete(id: string) {
    const result = await deleteCategory(id);
    if (result?.error) toast.error(result.error);
    else onSaved();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const result = await reorderCategories(ids);
    if (result?.error) toast.error(result.error);
    else onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>Reorder, rename, or remove menu categories.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {categories.map((cat, i) => (
            <div key={cat.id} className="flex items-center gap-2">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon" className="size-6" disabled={i === 0} onClick={() => handleMove(i, -1)}>
                  <ArrowUp className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={i === categories.length - 1}
                  onClick={() => handleMove(i, 1)}
                >
                  <ArrowDown className="size-3" />
                </Button>
              </div>
              <Input
                defaultValue={cat.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== cat.name) handleRename(cat.id, e.target.value.trim());
                }}
              />
              <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t pt-4">
          <Input
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button type="button" onClick={handleAdd} disabled={adding}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
