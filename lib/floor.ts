import type { FloorObjectKind, FloorObjectShape, FloorObjectRow } from "@/lib/types";

export const GRID = 10;
export const CANVAS_W = 1000;
export const CANVAS_H = 650;

export function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** An object being edited on the canvas — a row, or a not-yet-saved draft. */
export type EditableObject = Omit<FloorObjectRow, "created_at" | "venue_id"> & {
  venue_id?: string;
  created_at?: string;
};

export interface PaletteEntry {
  kind: FloorObjectKind;
  shape: FloorObjectShape;
  label: string;
  seats: number;
  w: number;
  h: number;
}

export const TABLE_PALETTE: PaletteEntry[] = [
  { kind: "table", shape: "round", label: "Round table", seats: 2, w: 70, h: 70 },
  { kind: "table", shape: "square", label: "Square table", seats: 4, w: 90, h: 90 },
  { kind: "table", shape: "rect", label: "Long table", seats: 6, w: 150, h: 90 },
  { kind: "table", shape: "stool", label: "Bar stool", seats: 1, w: 36, h: 36 },
];

export const FIXTURE_PALETTE: PaletteEntry[] = [
  { kind: "kitchen", shape: "rect_fixture", label: "Kitchen", seats: 0, w: 200, h: 150 },
  { kind: "bar", shape: "rect_fixture", label: "Bar counter", seats: 0, w: 220, h: 90 },
  { kind: "pos", shape: "rect", label: "POS", seats: 0, w: 70, h: 50 },
  { kind: "entrance", shape: "rect", label: "Entrance", seats: 0, w: 60, h: 40 },
  { kind: "restroom", shape: "rect", label: "Restroom", seats: 0, w: 70, h: 50 },
  { kind: "stairs", shape: "rect", label: "Stairs", seats: 0, w: 60, h: 100 },
  { kind: "wall", shape: "line", label: "Wall", seats: 0, w: 200, h: 10 },
  { kind: "plant", shape: "round", label: "Plant", seats: 0, w: 40, h: 40 },
];

export const FIXTURE_KINDS: FloorObjectKind[] = [
  "kitchen",
  "bar",
  "pos",
  "entrance",
  "restroom",
  "wall",
  "plant",
  "stairs",
  "other",
];

export function isTable(o: { kind: FloorObjectKind }): boolean {
  return o.kind === "table";
}

/** Next free table label — numeric tables get the next integer. */
export function nextTableLabel(objects: { kind: FloorObjectKind; label: string }[]): string {
  const numbers = objects
    .filter(isTable)
    .map((o) => parseInt(o.label, 10))
    .filter((n) => !Number.isNaN(n));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return String(next);
}

/** Non-overlapping spot for a newly dropped object, scanning the grid. */
export function findFreeSpot(
  objects: { x: number; y: number; w: number; h: number }[],
  w: number,
  h: number
): { x: number; y: number } {
  const step = 20;
  for (let y = 20; y + h < CANVAS_H - 20; y += step) {
    for (let x = 20; x + w < CANVAS_W - 20; x += step) {
      const overlaps = objects.some(
        (o) => x < o.x + o.w + 10 && x + w + 10 > o.x && y < o.y + o.h + 10 && y + h + 10 > o.y
      );
      if (!overlaps) return { x: snap(x), y: snap(y) };
    }
  }
  return { x: 20, y: 20 };
}

export const FIXTURE_LABEL: Record<FloorObjectKind, string> = {
  table: "Table",
  kitchen: "Kitchen",
  bar: "Bar",
  pos: "POS",
  entrance: "Entrance",
  restroom: "Restroom",
  wall: "Wall",
  plant: "Plant",
  stairs: "Stairs",
  other: "Other",
};
