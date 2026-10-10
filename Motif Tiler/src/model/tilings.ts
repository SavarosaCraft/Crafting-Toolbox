import type { LayoutType } from "./layout";

/** One placeable position in a tiling. `kind` is undefined for the layout's primary shape. */
export interface CellSlot {
  kind?: string;
  row: number;
  column: number;
}

/** Stable cell id. Primary-shape cells keep the plain "row:column" ids used since day one. */
export function slotId(kind: string | undefined, row: number, column: number): string {
  return kind ? `${kind}:${row}:${column}` : `${row}:${column}`;
}

/**
 * Every cell position that exists for a tiling on a `columns` x `rows` board.
 *
 * Single-shape layouts (rectangular, triangular, hexagonal) are just rows x columns primary
 * cells. Compound tilings add further shape kinds on top — this is the one place that says
 * which positions exist, so adding a tiling means adding a case here plus its polygon in
 * render/canvasRenderer.ts (geometry + layoutSize).
 *
 * "octagonal" is the truncated square tiling (4.8.8): `columns` x `rows` octagons, plus a
 * small square (drawn as a diamond) in each gap where four octagons meet. Only complete
 * gaps get a square, so there are (columns - 1) x (rows - 1) of them.
 */
export function tilingSlots(type: LayoutType, rows: number, columns: number): CellSlot[] {
  const slots: CellSlot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      slots.push({ row, column });
    }
  }

  if (type === "octagonal") {
    for (let row = 0; row < rows - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        slots.push({ kind: "square", row, column });
      }
    }
  }

  return slots;
}
