# Owner A5 — Floor plan editor

**Person A. Branch `feat/owner`.**

The owner draws their room from the top down. The single most important decision here:
**one canvas component serves both the editor and the live view.** Same geometry, same
coordinates, guaranteed parity — what you draw is exactly what goes live.

---

## Files

```
lib/floor.ts
components/floor/floor-canvas.tsx     <- shared by editor (A5) and live view (A6)
components/floor/floor-editor.tsx
app/dashboard/floor/actions.ts
app/dashboard/floor/edit/page.tsx
```

`app/dashboard/floor/page.tsx` stays as the placeholder until A6.

---

## Why SVG rather than canvas

- Order pins animate with plain CSS.
- Text stays crisp on a projector at any zoom.
- Hit-testing is free — every shape is a real DOM node with an `onClick`.
- No extra dependency.

The canvas is a fixed `viewBox="0 0 1000 650"` scaled to its container, so all stored
coordinates are resolution-independent.

---

## 1. `lib/floor.ts`

```ts
export const GRID = 10;
export const CANVAS_W = 1000;
export const CANVAS_H = 650;

export function snap(value: number): number;                    // round to nearest GRID
export function clamp(value: number, min: number, max: number): number;

// A row, or a draft that has not been saved yet.
export type EditableObject = Omit<FloorObjectRow, "created_at" | "venue_id"> & {
  venue_id?: string;
  created_at?: string;
};

export interface PaletteEntry {
  kind: FloorObjectKind; shape: FloorObjectShape;
  label: string; seats: number; w: number; h: number;
}

export const TABLE_PALETTE: PaletteEntry[];
export const FIXTURE_PALETTE: PaletteEntry[];

export function isTable(o: { kind: FloorObjectKind }): boolean;
export function nextTableLabel(objects: { kind; label }[]): string;
export function findFreeSpot(objects, w, h): { x: number; y: number };
export const FIXTURE_LABEL: Record<FloorObjectKind, string>;
```

**`TABLE_PALETTE`** — Round table (`round`, 2 seats, 70×70), Square table (`square`, 4,
90×90), Long table (`rect`, 6, 150×90), Bar stool (`stool`, 1, 36×36).

**`FIXTURE_PALETTE`** — Kitchen (`rect_fixture`, 200×150), Bar counter (`rect_fixture`,
220×90), POS (`rect`, 70×50), Entrance (`rect`, 60×40), Restroom (`rect`, 70×50), Stairs
(`rect`, 60×100), Wall (`line`, 200×10), Plant (`round`, 40×40). All `seats: 0`.

**`nextTableLabel`** — parse existing table labels as integers, ignore non-numeric ones,
return `max + 1` as a string (or `"1"`).

**`findFreeSpot`** — scan the grid in 20px steps from (20,20) looking for a position where
the new object's bounds, padded by 10px, overlap nothing. Fall back to (20,20).

---

## 2. `components/floor/floor-canvas.tsx` — the shared component

`"use client"`. **Read this section carefully — A6 depends on every prop.**

```ts
export type TableStatus = "free" | "occupied" | "active" | "amber" | "late";

export interface LiveTableInfo {
  status: TableStatus;
  orderNumbers: number[];   // drives the numbered pins
  customerName?: string;
}

export function FloorCanvas({
  objects,                 // EditableObject[]
  editable = false,        // true  -> editor mode
  selectedId = null,
  live,                    // Record<objectId, LiveTableInfo> -> live mode
  onSelect, onChange, onCommit,
  onTableClick,            // live mode: clicking a table
  className,
}): JSX.Element
```

### Rendering rules

- `<defs>` with a `<pattern>` grid at `GRID * 4` spacing, stroked with `currentColor` at
  0.5 width and `className="text-border"`. Fill the whole canvas with it.
- Sort objects by `z` before rendering.
- Each object is a `<g transform={`rotate(${rotation} ${cx} ${cy})`}>`.
- `round` and `stool` render `<ellipse>`; everything else `<rect>` with `rx={8}` (or `2`
  for `line`).
- Fill: tables use the status colour when `live` info exists, otherwise `var(--muted)`.
  Non-tables always use `var(--secondary)` at 0.9 opacity.

```
free     -> var(--status-free)
occupied -> var(--status-occupied)
active   -> var(--status-active)
amber    -> var(--status-amber)
late     -> var(--status-red)
```

- Centred `<text>` label: 15px semibold for tables, 11px for fixtures.
- Tables with seats show `{n} seats` in 10px muted text just below the shape.
- Selected object (editor only) gets `stroke="var(--ring)"` at width 3 and a 12×12
  resize handle at its bottom-right corner with `cursor-se-resize`.

### Numbered order pins (live mode)

When `live[obj.id].orderNumbers` is non-empty, draw circles above the table's top-right,
offset 22px apart, capped at three with a `+N` text for the rest. Each is a `<circle r={12}>`
with a 2px `var(--card)` outline and the order number centred in 11px bold.

Pin colour is `var(--status-red)` when the table is `late`, otherwise
`var(--status-active)`. When late, wrap the pin group in `className="animate-pulse-ring"`.

### Dragging (editor only)

Use pointer events, not mouse events — they work with touch and pen.

- Keep drag state in a `useRef`, not `useState`: `{ id, mode: "move" | "resize", startX,
  startY, origin: {x,y,w,h} }`. Putting it in state re-renders on every pointer move and
  the drag stutters.
- On `pointerdown`, call `setPointerCapture(e.pointerId)` so the drag survives the cursor
  leaving the shape.
- Convert client coordinates to SVG space with `getBoundingClientRect()`:

```ts
x: ((e.clientX - rect.left) / rect.width) * CANVAS_W
y: ((e.clientY - rect.top)  / rect.height) * CANVAS_H
```

- **Move:** new position is origin + delta, clamped to the canvas minus the object's size,
  then snapped to `GRID`.
- **Resize:** new size is origin + delta, snapped, with a floor of `GRID * 2`.
- On `pointerup` / `pointerleave`, clear the ref and call `onCommit()`.
- Clicking empty canvas calls `onSelect(null)`.

---

## 3. `app/dashboard/floor/actions.ts`

```ts
saveFloorArea(areaId: string, objects: EditableObject[], deletedIds: string[]): Promise<ActionResult>
createArea(name: string): Promise<ActionResult<{ id: string }>>
renameArea(id: string, name: string): Promise<ActionResult>
deleteArea(id: string): Promise<ActionResult>
applyTemplate(areaId: string, businessType: BusinessType): Promise<ActionResult>
```

`saveFloorArea` deletes `deletedIds` first (scoped `.eq("venue_id", venueId)`), then
**upserts** everything else with `z` set to array index. Upsert handles new and existing
rows in one call because drafts already carry a client-generated `crypto.randomUUID()`.

`deleteArea` refuses when only one area remains: `return { error: "You need at least one area." }`.

`applyTemplate` deletes the area's objects and inserts the preset's floor objects for its
**first** area. Destructive — the UI must confirm.

Revalidate both `/dashboard/floor` and `/dashboard/floor/edit`.

---

## 4. `components/floor/floor-editor.tsx`

`"use client"`. Layout: canvas on the left, a 16rem sidebar on the right
(`lg:grid-cols-[1fr_16rem]`).

### State

`activeArea`, `objects`, `selectedId`, `deletedIds`, `dirty`, `saving`.

**Undo/redo** uses whole-canvas snapshots in two `useRef` stacks. At this object count it
costs nothing and it makes multi-object operations atomic:

```ts
const undoStack = useRef<EditableObject[][]>([]);
const redoStack = useRef<EditableObject[][]>([]);
// push before every mutation; cap at 50; clear redo on any new action
```

**Drag history:** a drag fires `onChange` on every pointer move — pushing history each time
would fill the stack with hundreds of near-identical frames. Use a `dragSnapshot` ref that
pushes once on the first move and resets in `onCommit`.

### Toolbar

Area `Tabs` on the left. On the right: Undo, Redo, "Use template", and a Save button that
reads "Save changes" when dirty and "Saved" (disabled) when not.

Switching area with unsaved changes must warn before discarding.

### Sidebar

- **Tables** card — a button per `TABLE_PALETTE` entry. Clicking places the object at
  `findFreeSpot`, auto-labelled via `nextTableLabel`.
- **Fixtures** card — same for `FIXTURE_PALETTE`, labelled with the palette label.
- **Selected** card (only when something is selected) — label input (titled "Table number"
  for tables, "Label" otherwise), seats input for tables, Rotate (+45° modulo 360),
  Copy (duplicate at a free spot with a fresh id and next label), Delete.
- **Areas** card — rename-on-blur inputs, delete buttons, and an add row.
- Footer line: `{n} tables · {m} seats`.

Deleting an object only adds to `deletedIds` if it exists server-side — check against the
props. Drafts just disappear.

"Use template" opens an `AlertDialog` stating plainly that everything in the area will be
replaced and it cannot be undone.

## 5. `app/dashboard/floor/edit/page.tsx`

Server component. `requireVenue()`, then `Promise.all`: venue `business_type`,
`floor_areas` by `sort_order`, `floor_objects` by `z`. Group objects into a
`Record<areaId, FloorObjectRow[]>` and pass down. Header has a "Live view" button linking
to `/dashboard/floor`.

---

## Checkpoint

```bash
npx tsc --noEmit && npx eslint . && npm run build
```

Manual at `/dashboard/floor/edit`:
1. The preset layout from onboarding is drawn. ✓
2. Drag a table — it moves and snaps to the grid. ✓
3. Select it, drag the corner handle — it resizes. ✓
4. Rename it, change its seats, rotate, duplicate. ✓
5. Add a table from the palette — it lands somewhere empty with the next number. ✓
6. Undo several times, then redo. ✓
7. Save, hard-reload — the layout is identical. ✓
8. Add an area, switch tabs, draw in it, save, switch back and forth. ✓
9. Try to delete your only area → blocked with a clear message. ✓

Commit: `git commit -am "Floor plan editor"`
