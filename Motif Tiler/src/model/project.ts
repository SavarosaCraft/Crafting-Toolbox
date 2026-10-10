import type { Cell } from "./cell";
import type { LayoutSettings, LayoutType } from "./layout";
import type { Motif } from "./motif";
import { slotId, tilingSlots } from "./tilings";

export interface Project {
  version: 1;
  name: string;
  layout: LayoutSettings;
  motifs: Motif[];
  cells: Cell[];
  /** Custom color swatches added via the color palette's "+" button. "White" (no color) is implicit, not stored here. */
  palette: string[];
}

export function createProject(): Project {
  const layout: LayoutSettings = { type: "rectangular", columns: 10, rows: 8 };
  return {
    version: 1,
    name: "Untitled Motif Project",
    layout,
    motifs: [],
    cells: createCells(layout.type, layout.rows, layout.columns),
    palette: [],
  };
}

/** A blank (unfilled, untinted) cell for every position the tiling has. */
export function createCells(type: LayoutType, rows: number, columns: number): Cell[] {
  return tilingSlots(type, rows, columns).map((slot) => ({
    id: slotId(slot.kind, slot.row, slot.column),
    row: slot.row,
    column: slot.column,
    ...(slot.kind ? { kind: slot.kind } : {}),
    motifId: null,
    isEmpty: false,
    tint: "#ffffff",
    alpha: 1,
  }));
}

/**
 * Resizes the board to `newRows` x `newColumns` by adding or removing cells at the
 * edges — it never touches or rescales existing content. Cells at positions that still
 * exist keep their motif/tint/EMPTY state exactly as-is; newly added positions (from
 * growing the board) start blank; positions that fall outside the new bounds (from
 * shrinking the board) are simply dropped, same as any other edit, so shrinking is only
 * undoable through the normal undo history, not silently recoverable afterward.
 *
 * Works for compound tilings too: it builds the full set of cells the tiling has at the
 * new size, then reuses the existing cell wherever the same id already exists.
 */
export function resizeCells(existingCells: Cell[], type: LayoutType, newRows: number, newColumns: number): Cell[] {
  const existingById = new Map(existingCells.map((cell) => [cell.id, cell]));
  return createCells(type, newRows, newColumns).map((blank) => existingById.get(blank.id) ?? blank);
}
