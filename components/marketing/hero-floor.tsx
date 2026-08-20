"use client";

import { useEffect, useState } from "react";
import { FloorCanvas, type LiveTableInfo, type TableStatus } from "@/components/floor/floor-canvas";
import type { EditableObject } from "@/lib/floor";

// A self-contained loop for the landing page: same FloorCanvas the product
// uses, driven by a scripted sequence rather than the database.
const LAYOUT: EditableObject[] = [
  { id: "k", area_id: "a", kind: "kitchen", shape: "rect_fixture", label: "Kitchen", seats: 0, x: 30, y: 30, w: 190, h: 140, rotation: 0, z: 0 },
  { id: "b", area_id: "a", kind: "bar", shape: "rect_fixture", label: "Bar", seats: 0, x: 30, y: 195, w: 190, h: 80, rotation: 0, z: 1 },
  { id: "e", area_id: "a", kind: "entrance", shape: "rect", label: "Entrance", seats: 0, x: 880, y: 30, w: 70, h: 40, rotation: 0, z: 2 },
  { id: "t1", area_id: "a", kind: "table", shape: "round", label: "1", seats: 2, x: 300, y: 60, w: 74, h: 74, rotation: 0, z: 3 },
  { id: "t2", area_id: "a", kind: "table", shape: "round", label: "2", seats: 2, x: 440, y: 60, w: 74, h: 74, rotation: 0, z: 4 },
  { id: "t3", area_id: "a", kind: "table", shape: "square", label: "3", seats: 4, x: 590, y: 50, w: 94, h: 94, rotation: 0, z: 5 },
  { id: "t4", area_id: "a", kind: "table", shape: "square", label: "4", seats: 4, x: 300, y: 210, w: 94, h: 94, rotation: 0, z: 6 },
  { id: "t5", area_id: "a", kind: "table", shape: "rect", label: "5", seats: 6, x: 460, y: 210, w: 160, h: 94, rotation: 0, z: 7 },
  { id: "t6", area_id: "a", kind: "table", shape: "round", label: "6", seats: 2, x: 700, y: 215, w: 74, h: 74, rotation: 0, z: 8 },
  { id: "t7", area_id: "a", kind: "table", shape: "square", label: "7", seats: 4, x: 300, y: 370, w: 94, h: 94, rotation: 0, z: 9 },
  { id: "t8", area_id: "a", kind: "table", shape: "rect", label: "8", seats: 8, x: 470, y: 360, w: 210, h: 100, rotation: 0, z: 10 },
  { id: "t9", area_id: "a", kind: "table", shape: "round", label: "9", seats: 2, x: 740, y: 375, w: 74, h: 74, rotation: 0, z: 11 },
];

type Frame = Record<string, { status: TableStatus; orders: number[] }>;

const SCRIPT: Frame[] = [
  { t3: { status: "occupied", orders: [] } },
  { t3: { status: "active", orders: [14] }, t5: { status: "occupied", orders: [] } },
  { t3: { status: "active", orders: [14] }, t5: { status: "active", orders: [15] }, t8: { status: "occupied", orders: [] } },
  { t3: { status: "amber", orders: [14] }, t5: { status: "active", orders: [15] }, t8: { status: "active", orders: [16] } },
  { t3: { status: "late", orders: [14] }, t5: { status: "active", orders: [15, 17] }, t8: { status: "active", orders: [16] }, t1: { status: "occupied", orders: [] } },
  { t5: { status: "amber", orders: [15, 17] }, t8: { status: "active", orders: [16] }, t1: { status: "active", orders: [18] } },
  { t5: { status: "active", orders: [17] }, t1: { status: "active", orders: [18] }, t9: { status: "occupied", orders: [] } },
  { t1: { status: "active", orders: [18] }, t9: { status: "active", orders: [19] } },
];

export function HeroFloor() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SCRIPT.length), 2200);
    return () => clearInterval(id);
  }, []);

  const live: Record<string, LiveTableInfo> = {};
  for (const obj of LAYOUT) {
    if (obj.kind !== "table") continue;
    const state = SCRIPT[frame][obj.id];
    live[obj.id] = state
      ? { status: state.status, orderNumbers: state.orders }
      : { status: "free", orderNumbers: [] };
  }

  return (
    <div className="dark rounded-xl border bg-background p-3 shadow-2xl">
      <FloorCanvas objects={LAYOUT} live={live} className="border-0" />
    </div>
  );
}
