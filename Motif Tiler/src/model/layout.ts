export type LayoutType =
  | "rectangular"
  | "triangular"
  | "hexagonal"
  | "pentagonal"
  | "octagonal"
  | "compound";

export interface LayoutSettings {
  type: LayoutType;
  columns: number;
  rows: number;
}
