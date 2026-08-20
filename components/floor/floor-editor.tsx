"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  LayoutTemplate,
  Loader2,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FloorCanvas } from "@/components/floor/floor-canvas";
import {
  TABLE_PALETTE,
  FIXTURE_PALETTE,
  findFreeSpot,
  nextTableLabel,
  isTable,
  type EditableObject,
  type PaletteEntry,
} from "@/lib/floor";
import { saveFloorArea, createArea, renameArea, deleteArea, applyTemplate } from "@/app/dashboard/floor/actions";
import type { FloorAreaRow, FloorObjectRow, BusinessType } from "@/lib/types";

export function FloorEditor({
  areas,
  objectsByArea,
  businessType,
}: {
  areas: FloorAreaRow[];
  objectsByArea: Record<string, FloorObjectRow[]>;
  businessType: BusinessType;
}) {
  const router = useRouter();
  const [activeArea, setActiveArea] = useState(areas[0]?.id ?? "");
  const [objects, setObjects] = useState<EditableObject[]>(objectsByArea[areas[0]?.id ?? ""] ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");

  // Undo/redo stacks hold whole-canvas snapshots — simple and reliable at
  // this object count, and it makes multi-object operations atomic.
  const undoStack = useRef<EditableObject[][]>([]);
  const redoStack = useRef<EditableObject[][]>([]);

  const pushHistory = useCallback((current: EditableObject[]) => {
    undoStack.current.push(current.map((o) => ({ ...o })));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const selected = useMemo(() => objects.find((o) => o.id === selectedId) ?? null, [objects, selectedId]);

  function switchArea(areaId: string) {
    if (dirty && !confirm("You have unsaved changes. Switch area and lose them?")) return;
    setActiveArea(areaId);
    setObjects(objectsByArea[areaId] ?? []);
    setSelectedId(null);
    setDeletedIds([]);
    setDirty(false);
    undoStack.current = [];
    redoStack.current = [];
  }

  function addFromPalette(entry: PaletteEntry) {
    pushHistory(objects);
    const spot = findFreeSpot(objects, entry.w, entry.h);
    const label = entry.kind === "table" ? nextTableLabel(objects) : entry.label;
    setObjects((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        area_id: activeArea,
        kind: entry.kind,
        shape: entry.shape,
        label,
        seats: entry.seats,
        x: spot.x,
        y: spot.y,
        w: entry.w,
        h: entry.h,
        rotation: 0,
        z: prev.length,
      },
    ]);
    setDirty(true);
  }

  function patchObject(id: string, patch: Partial<EditableObject>) {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    setDirty(true);
  }

  /** Called once when a drag gesture starts, so undo restores pre-drag state. */
  const dragSnapshot = useRef(false);
  function onCanvasChange(id: string, patch: Partial<EditableObject>) {
    if (!dragSnapshot.current) {
      pushHistory(objects);
      dragSnapshot.current = true;
    }
    patchObject(id, patch);
  }
  function onCanvasCommit() {
    dragSnapshot.current = false;
  }

  function duplicateSelected() {
    if (!selected) return;
    pushHistory(objects);
    const spot = findFreeSpot(objects, selected.w, selected.h);
    setObjects((prev) => [
      ...prev,
      {
        ...selected,
        id: crypto.randomUUID(),
        label: isTable(selected) ? nextTableLabel(prev) : selected.label,
        x: spot.x,
        y: spot.y,
        z: prev.length,
      },
    ]);
    setDirty(true);
  }

  function rotateSelected() {
    if (!selected) return;
    pushHistory(objects);
    patchObject(selected.id, { rotation: (selected.rotation + 45) % 360 });
  }

  function deleteSelected() {
    if (!selected) return;
    pushHistory(objects);
    // Only track ids that exist server-side; drafts just vanish.
    if (objectsByArea[activeArea]?.some((o) => o.id === selected.id)) {
      setDeletedIds((prev) => [...prev, selected.id]);
    }
    setObjects((prev) => prev.filter((o) => o.id !== selected.id));
    setSelectedId(null);
    setDirty(true);
  }

  function undo() {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(objects.map((o) => ({ ...o })));
    setObjects(prev);
    setSelectedId(null);
    setDirty(true);
  }

  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(objects.map((o) => ({ ...o })));
    setObjects(next);
    setSelectedId(null);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const result = await saveFloorArea(activeArea, objects, deletedIds);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Floor plan saved");
    setDeletedIds([]);
    setDirty(false);
    router.refresh();
  }

  async function handleAddArea() {
    if (!newAreaName.trim()) return;
    const result = await createArea(newAreaName.trim());
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setNewAreaName("");
    router.refresh();
  }

  async function handleRenameArea(id: string, name: string) {
    const result = await renameArea(id, name);
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  async function handleDeleteArea(id: string) {
    const result = await deleteArea(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleApplyTemplate() {
    setConfirmTemplate(false);
    const result = await applyTemplate(activeArea, businessType);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Template applied");
    setDirty(false);
    setDeletedIds([]);
    router.refresh();
  }

  const tableCount = objects.filter(isTable).length;
  const seatCount = objects.filter(isTable).reduce((sum, o) => sum + o.seats, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={activeArea} onValueChange={switchArea}>
          <TabsList>
            {areas.map((a) => (
              <TabsTrigger key={a.id} value={a.id}>
                {a.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={undo} title="Undo">
            <Undo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} title="Redo">
            <Redo2 className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setConfirmTemplate(true)}>
            <LayoutTemplate className="size-4" />
            Use template
          </Button>
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <FloorCanvas
          objects={objects}
          editable
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={onCanvasChange}
          onCommit={onCanvasCommit}
        />

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tables</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {TABLE_PALETTE.map((entry) => (
                <Button key={entry.label} variant="outline" size="sm" onClick={() => addFromPalette(entry)}>
                  <Plus className="size-3" />
                  {entry.label.replace(" table", "")}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Fixtures</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {FIXTURE_PALETTE.map((entry) => (
                <Button key={entry.label} variant="outline" size="sm" onClick={() => addFromPalette(entry)}>
                  <Plus className="size-3" />
                  {entry.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Selected</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="obj-label">{isTable(selected) ? "Table number" : "Label"}</Label>
                  <Input
                    id="obj-label"
                    value={selected.label}
                    onChange={(e) => patchObject(selected.id, { label: e.target.value })}
                  />
                </div>
                {isTable(selected) && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="obj-seats">Seats</Label>
                    <Input
                      id="obj-seats"
                      type="number"
                      min={0}
                      value={selected.seats}
                      onChange={(e) => patchObject(selected.id, { seats: Number(e.target.value) })}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={rotateSelected}>
                    <RotateCw className="size-3" />
                    Rotate
                  </Button>
                  <Button variant="outline" size="sm" onClick={duplicateSelected}>
                    <Copy className="size-3" />
                    Copy
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={deleteSelected}>
                  <Trash2 className="size-3" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Areas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {areas.map((a) => (
                <div key={a.id} className="flex items-center gap-1">
                  <Input
                    defaultValue={a.name}
                    className="h-8"
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== a.name)
                        handleRenameArea(a.id, e.target.value.trim());
                    }}
                  />
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDeleteArea(a.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  className="h-8"
                  placeholder="New area"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
                />
                <Button variant="ghost" size="icon" className="size-8" onClick={handleAddArea}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground">
            {tableCount} tables · {seatCount} seats
          </div>
        </div>
      </div>

      <AlertDialog open={confirmTemplate} onOpenChange={setConfirmTemplate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this area with a template?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything currently in this area is deleted and replaced with the starter layout for your
              venue type. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyTemplate}>Apply template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
