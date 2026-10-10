export interface Cell {
  id: string;
  row: number;
  column: number;
  /**
   * Which shape this cell is, for compound tilings that mix shapes (e.g. "square" among
   * the octagons in the 4.8.8 tiling). Undefined means the layout's primary shape, which
   * is how every cell in the single-shape layouts (rectangular/triangular/hexagonal) and
   * every project saved before compound tilings existed already looks.
   */
  kind?: string;
  motifId: string | null;
  /**
   * True when the user has explicitly set this cell to EMPTY (deliberate negative space).
   * A cell with motifId === null and isEmpty === false is just unfilled/not-yet-placed —
   * these two states are rendered differently so they aren't mistaken for each other.
   */
  isEmpty: boolean;
  tint: string;
  alpha: number;
}
