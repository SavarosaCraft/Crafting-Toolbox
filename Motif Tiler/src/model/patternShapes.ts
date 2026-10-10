export type BoundaryShape = "rectangle" | "square" | "triangle" | "hexagon" | "octagon";

export interface Point { x: number; y: number; }

export interface ShapeRect { x: number; y: number; width: number; height: number; }

/**
 * Fixed height:width ratio for a *regular* (equal-sided) shape of each type.
 * - triangle: equilateral triangle standing on its base -> height = width * sqrt(3)/2.
 * - hexagon: pointy-top regular hexagon -> height = width * 2/sqrt(3).
 * - octagon: regular octagon with flat sides facing up/down/left/right -> height = width.
 * - square: height = width. (Rotate it 45 degrees for the diamond in the 4.8.8 tiling.)
 */
const REGULAR_RATIO: Partial<Record<BoundaryShape, number>> = {
  triangle: Math.sqrt(3) / 2,
  hexagon: 2 / Math.sqrt(3),
  octagon: 1,
  square: 1,
};

/**
 * Returns the largest regular (equal-sided) rect of the given shape's proportions that
 * fits inside `rect`, centered within it. Rectangles are returned unchanged. This is what
 * keeps a dragged triangle/hexagon selection from stretching into whatever aspect ratio
 * the user happened to drag.
 */
export function normalizeShapeRect(shape: BoundaryShape, rect: ShapeRect): ShapeRect {
  const targetRatio = REGULAR_RATIO[shape];
  if (!targetRatio || rect.width <= 0 || rect.height <= 0) return rect;

  let width = rect.width;
  let height = width * targetRatio;
  if (height > rect.height) {
    height = rect.height;
    width = height / targetRatio;
  }

  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

/**
 * Returns the polygon for the given boundary shape, inscribed within `rect` (same
 * coordinate space as `rect`). Triangle/hexagon are first normalized to a regular
 * (equal-sided) shape centered in `rect` — see `normalizeShapeRect`. For "triangle",
 * `flipped` mirrors it point-down instead of point-up, matching the alternating
 * orientation used by the triangular tessellation.
 */
export function boundaryPolygon(shape: BoundaryShape, rect: ShapeRect, flipped = false): Point[] {
  const box = normalizeShapeRect(shape, rect);
  const { x, y, width, height } = box;

  switch (shape) {
    case "triangle": {
      const top = { x: x + width / 2, y: flipped ? y + height : y };
      const baseY = flipped ? y : y + height;
      return [top, { x, y: baseY }, { x: x + width, y: baseY }];
    }
    case "octagon": {
      // Regular octagon inscribed in the (square) box: edge length a = width / (1 + sqrt 2),
      // so each corner is cut off by a / 2 on either side of the box's edge midpoints.
      const a = width / (1 + Math.SQRT2);
      const e = a / 2;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const h = width / 2;
      return [
        { x: cx - e, y: cy - h }, { x: cx + e, y: cy - h },
        { x: cx + h, y: cy - e }, { x: cx + h, y: cy + e },
        { x: cx + e, y: cy + h }, { x: cx - e, y: cy + h },
        { x: cx - h, y: cy + e }, { x: cx - h, y: cy - e },
      ];
    }
    case "hexagon": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = width / Math.sqrt(3); // vertex-to-center radius for a pointy-top hexagon
      return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
    }
    default:
      return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
  }
}

/**
 * Applies a rotation (about the shape's own center), a size scale (also about its
 * center), and then an x/y offset to the base polygon for `shape`/`rect`. `sizeScale`
 * of 1 is the largest regular shape that fits `rect` (see normalizeShapeRect); smaller
 * values shrink it inward. `offsetX`/`offsetY` are in the same coordinate space as
 * `rect` and are applied last, so they move the shape without affecting its rotation
 * or size.
 */
export interface ShapeTransform {
  rotationDeg: number;
  sizeScale: number;
  offsetX?: number;
  offsetY?: number;
}

export function transformedPolygon(
  shape: BoundaryShape,
  rect: ShapeRect,
  flipped = false,
  transform: ShapeTransform = { rotationDeg: 0, sizeScale: 1 },
): Point[] {
  const base = boundaryPolygon(shape, rect, flipped);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rad = (transform.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const scale = transform.sizeScale;
  const offsetX = transform.offsetX ?? 0;
  const offsetY = transform.offsetY ?? 0;

  return base.map((p) => {
    const dx = (p.x - cx) * scale;
    const dy = (p.y - cy) * scale;
    return {
      x: cx + dx * cos - dy * sin + offsetX,
      y: cy + dx * sin + dy * cos + offsetY,
    };
  });
}

/** Tight axis-aligned bounding box of a polygon (used to size the actual crop after rotation). */
export function polygonBounds(points: Point[]): ShapeRect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
