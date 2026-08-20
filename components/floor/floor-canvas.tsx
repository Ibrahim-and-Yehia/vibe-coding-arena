"use client";

import { useRef } from "react";
import { CANVAS_W, CANVAS_H, GRID, isTable, type EditableObject } from "@/lib/floor";
import { cn } from "@/lib/utils";

export type TableStatus = "free" | "occupied" | "active" | "amber" | "late";

const STATUS_FILL: Record<TableStatus, string> = {
  free: "var(--status-free)",
  occupied: "var(--status-occupied)",
  active: "var(--status-active)",
  amber: "var(--status-amber)",
  late: "var(--status-red)",
};

export interface LiveTableInfo {
  status: TableStatus;
  /** Order numbers currently open on this table, for the numbered pin. */
  orderNumbers: number[];
  customerName?: string;
}

/**
 * One canvas, two modes. `editable` turns on drag/resize/select; otherwise it
 * renders the same geometry read-only with live status colouring and numbered
 * order pins. Sharing the component guarantees what you draw is exactly what
 * goes live.
 */
export function FloorCanvas({
  objects,
  editable = false,
  selectedId = null,
  live,
  onSelect,
  onChange,
  onCommit,
  onTableClick,
  className,
}: {
  objects: EditableObject[];
  editable?: boolean;
  selectedId?: string | null;
  live?: Record<string, LiveTableInfo>;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<EditableObject>) => void;
  onCommit?: () => void;
  onTableClick?: (objectId: string) => void;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origin: { x: number; y: number; w: number; h: number };
  } | null>(null);

  function toSvgPoint(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  function startDrag(e: React.PointerEvent, obj: EditableObject, mode: "move" | "resize") {
    if (!editable) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toSvgPoint(e);
    dragRef.current = {
      id: obj.id,
      mode,
      startX: p.x,
      startY: p.y,
      origin: { x: obj.x, y: obj.y, w: obj.w, h: obj.h },
    };
    onSelect?.(obj.id);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !editable) return;
    const p = toSvgPoint(e);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;

    if (drag.mode === "move") {
      onChange?.(drag.id, {
        x: Math.round(Math.min(Math.max(drag.origin.x + dx, 0), CANVAS_W - drag.origin.w) / GRID) * GRID,
        y: Math.round(Math.min(Math.max(drag.origin.y + dy, 0), CANVAS_H - drag.origin.h) / GRID) * GRID,
      });
    } else {
      onChange?.(drag.id, {
        w: Math.max(Math.round((drag.origin.w + dx) / GRID) * GRID, GRID * 2),
        h: Math.max(Math.round((drag.origin.h + dy) / GRID) * GRID, GRID * 2),
      });
    }
  }

  function endDrag() {
    if (dragRef.current) {
      dragRef.current = null;
      onCommit?.();
    }
  }

  const sorted = [...objects].sort((a, b) => a.z - b.z);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className={cn("w-full rounded-lg border bg-card touch-none select-none", className)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerDown={() => editable && onSelect?.(null)}
    >
      <defs>
        <pattern id="floor-grid" width={GRID * 4} height={GRID * 4} patternUnits="userSpaceOnUse">
          <path
            d={`M ${GRID * 4} 0 L 0 0 0 ${GRID * 4}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border"
          />
        </pattern>
      </defs>
      <rect width={CANVAS_W} height={CANVAS_H} fill="url(#floor-grid)" />

      {sorted.map((obj) => {
        const info = live?.[obj.id];
        const table = isTable(obj);
        const selected = editable && selectedId === obj.id;
        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;

        const fill = table
          ? info
            ? STATUS_FILL[info.status]
            : "var(--muted)"
          : "var(--secondary)";
        const clickable = !editable && table && !!onTableClick;

        return (
          <g
            key={obj.id}
            transform={`rotate(${obj.rotation} ${cx} ${cy})`}
            className={cn(editable && "cursor-move", clickable && "cursor-pointer")}
            onPointerDown={(e) => startDrag(e, obj, "move")}
            onClick={() => clickable && onTableClick?.(obj.id)}
          >
            {obj.shape === "round" || obj.shape === "stool" ? (
              <ellipse
                cx={cx}
                cy={cy}
                rx={obj.w / 2}
                ry={obj.h / 2}
                fill={fill}
                stroke={selected ? "var(--ring)" : "var(--border)"}
                strokeWidth={selected ? 3 : 1.5}
                opacity={table ? 1 : 0.9}
              />
            ) : (
              <rect
                x={obj.x}
                y={obj.y}
                width={obj.w}
                height={obj.h}
                rx={obj.shape === "line" ? 2 : 8}
                fill={fill}
                stroke={selected ? "var(--ring)" : "var(--border)"}
                strokeWidth={selected ? 3 : 1.5}
                opacity={table ? 1 : 0.9}
              />
            )}

            {/* Label: table number, or fixture name */}
            <text
              x={cx}
              y={cy + (table ? 1 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn("pointer-events-none font-semibold", table ? "text-[15px]" : "text-[11px]")}
              fill={table ? "var(--status-free-foreground)" : "var(--secondary-foreground)"}
            >
              {obj.label}
            </text>

            {table && obj.seats > 0 && (
              <text
                x={cx}
                y={obj.y + obj.h + 12}
                textAnchor="middle"
                className="pointer-events-none text-[10px]"
                fill="var(--muted-foreground)"
              >
                {obj.seats} seats
              </text>
            )}

            {/* Numbered order pins above the table */}
            {info && info.orderNumbers.length > 0 && (
              <g className={cn(info.status === "late" && "animate-pulse-ring")}>
                {info.orderNumbers.slice(0, 3).map((num, i) => (
                  <g key={num} transform={`translate(${obj.x + obj.w - 8 + i * 22}, ${obj.y - 10})`}>
                    <circle
                      r={12}
                      fill={info.status === "late" ? "var(--status-red)" : "var(--status-active)"}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none text-[11px] font-bold"
                      fill={info.status === "late" ? "var(--status-red-foreground)" : "var(--status-active-foreground)"}
                    >
                      {num}
                    </text>
                  </g>
                ))}
                {info.orderNumbers.length > 3 && (
                  <text
                    x={obj.x + obj.w - 8 + 3 * 22}
                    y={obj.y - 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[11px] font-bold"
                    fill="var(--muted-foreground)"
                  >
                    +{info.orderNumbers.length - 3}
                  </text>
                )}
              </g>
            )}

            {/* Resize handle */}
            {selected && (
              <rect
                x={obj.x + obj.w - 6}
                y={obj.y + obj.h - 6}
                width={12}
                height={12}
                rx={2}
                fill="var(--ring)"
                className="cursor-se-resize"
                onPointerDown={(e) => startDrag(e, obj, "resize")}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
