import type { BoundaryShape } from "./patternShapes";
export type { BoundaryShape } from "./patternShapes";

export interface PatternBoundary {
  /** Shape of the usable area. Bounding box below always applies; the shape is inscribed within it. */
  shape: BoundaryShape;
  /** Mirrors a "triangle" boundary point-down instead of point-up. Unused for other shapes. */
  flipped?: boolean;
  /** Extra rotation, in degrees, applied about the shape's own center. Defaults to 0. */
  rotationDeg?: number;
  /** Shrinks the shape inward from its max size within the bounding box, 0-1. Defaults to 1. */
  sizeScale?: number;
  /** Nudges the shape horizontally/vertically, in source pixels, after rotation/scale. Defaults to 0. */
  offsetX?: number;
  offsetY?: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Motif {
  id: string;
  name: string;
  sourceType: "jpg" | "png" | "svg";

  /**
   * The original uploaded artwork, at whatever size/resolution the user imported.
   * Kept so the pattern boundary can be re-drawn later without quality loss.
   * Not used directly for placement/rendering — see `dataUrl` below.
   */
  sourceDataUrl: string;
  sourceWidth: number;
  sourceHeight: number;

  /** Pattern boundary, in `source` image pixel coordinates. */
  patternBoundary: PatternBoundary;

  /**
   * The internal working copy: `sourceDataUrl` cropped to `patternBoundary` and downscaled
   * so its long edge is at most `MAX_WORKING_DIMENSION` px (see io/imageProcessing.ts).
   * This is what is actually placed into cells and drawn on the canvas, so a very large
   * upload never gets decoded/drawn at full size across every cell that uses it.
   */
  dataUrl: string;
  width: number;
  height: number;
}
