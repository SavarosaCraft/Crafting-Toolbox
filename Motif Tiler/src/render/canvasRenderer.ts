import type { Project } from "../model/project";
import type { Motif } from "../model/motif";
import type { Cell } from "../model/cell";

export const CELL_SIZE = 64;
const GAP = 1;

/**
 * Blank margin (in native units) around the board on every side. It exists so the outer
 * cell borders and the 3px selection outline aren't half-clipped at the canvas edge. It is
 * symmetric — the old code padded a whole extra cell on the right and bottom only, which
 * showed up as a lopsided white box and made Fit zoom measure the wrong size.
 */
const CANVAS_MARGIN = 4;

interface Point { x: number; y: number; }

/**
 * Decoded-image cache, keyed by motif id. Without this, the old code created a brand new
 * Image() for every motif-filled cell on every redraw, and each image's onload handler
 * triggered another full-grid redraw — which created more new Images, whose onload fired
 * again, and so on. That uncontrolled loop (worse the larger the motif files/grid) is what
 * froze the tab. Now each motif's image is decoded once and only triggers a single redraw
 * when it first becomes ready or when its working `dataUrl` actually changes.
 */
const imageCache = new Map<string, { dataUrl: string; image: HTMLImageElement; ready: boolean }>();

function getMotifImage(motif: Motif, onReady: () => void): HTMLImageElement | null {
  const cached = imageCache.get(motif.id);
  if (cached && cached.dataUrl === motif.dataUrl) {
    return cached.ready ? cached.image : null;
  }

  const image = new Image();
  const entry = { dataUrl: motif.dataUrl, image, ready: false };
  imageCache.set(motif.id, entry);
  image.onload = () => {
    entry.ready = true;
    onReady();
  };
  image.src = motif.dataUrl;
  return null;
}

function polygonPath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

/**
 * Checkerboard pattern used for cells explicitly set to EMPTY — the familiar "transparent
 * background" convention, so intentional negative space reads differently at a glance from
 * a cell that just hasn't been filled in yet (which stays a plain flat gray, see renderGrid).
 * Built once and cached, since createPattern only needs to run once per canvas context.
 */
let emptyPattern: CanvasPattern | null = null;
function getEmptyPattern(ctx: CanvasRenderingContext2D): CanvasPattern | string {
  if (emptyPattern) return emptyPattern;
  const tile = document.createElement("canvas");
  const half = 6;
  tile.width = half * 2;
  tile.height = half * 2;
  const tctx = tile.getContext("2d");
  if (!tctx) return "#e9e9e9";
  tctx.fillStyle = "#f4f4f4";
  tctx.fillRect(0, 0, half * 2, half * 2);
  tctx.fillStyle = "#e0e0e0";
  tctx.fillRect(0, 0, half, half);
  tctx.fillRect(half, half, half, half);
  emptyPattern = ctx.createPattern(tile, "repeat");
  return emptyPattern ?? "#e9e9e9";
}

/**
 * Polygon + center (native units, board origin at 0,0) for one cell.
 * Exported so tiling geometry can be tested directly.
 */
export function cellGeometry(project: Project, cell: Cell): { points: Point[]; center: Point } {
  const { row, column } = cell;
  const s = CELL_SIZE;

  switch (project.layout.type) {
    case "octagonal": {
      // Truncated square tiling (4.8.8). Octagons sit on a square grid with pitch s (their
      // flat-to-flat width), so neighbours share whole edges. `a` is the edge length; `d`
      // is how far a corner of the gap-square sits from the gap's center.
      const a = s / (1 + Math.SQRT2);
      const half = s / 2;

      if (cell.kind === "square") {
        // The gap where four octagons meet, centered on their shared corner.
        const cx = (column + 1) * s;
        const cy = (row + 1) * s;
        const d = a / Math.SQRT2;
        return {
          points: [
            { x: cx, y: cy - d }, { x: cx + d, y: cy },
            { x: cx, y: cy + d }, { x: cx - d, y: cy },
          ],
          center: { x: cx, y: cy },
        };
      }

      const cx = half + column * s;
      const cy = half + row * s;
      const e = a / 2;
      return {
        points: [
          { x: cx - e, y: cy - half }, { x: cx + e, y: cy - half },
          { x: cx + half, y: cy - e }, { x: cx + half, y: cy + e },
          { x: cx + e, y: cy + half }, { x: cx - e, y: cy + half },
          { x: cx - half, y: cy + e }, { x: cx - half, y: cy - e },
        ],
        center: { x: cx, y: cy },
      };
    }
    case "hexagonal": {
  // Pointy-topped hexagon with vertex-to-center distance r = s / 2
  const r = s / 2;
  const w = Math.sqrt(3) * r; // Width (corner-to-corner horizontal is 2*r, flat-to-flat is w)
  const h = 2 * r;            // Height

  // Shift odd rows horizontally by w / 2 (staggered columns)
  const x = w / 2 + column * w + (row % 2 ? w / 2 : 0);
  
  // Vertical step between row centers is 0.75 * h (or 1.5 * r)
  const y = r + row * (h * 0.75);

  // Rotate by 30° (PI / 6) to make it pointy-topped (or keep 0 for flat-topped)
  const points = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6; // + 30 deg offset for pointy top
    return { x: x + r * Math.cos(a), y: y + r * Math.sin(a) };
  });

  return { points, center: { x, y } };
}
    case "triangular": {
      // Equilateral triangles. Adjacent triangles alternate orientation.
      const side = s;
      const h = side * Math.sqrt(3) / 2;
      const x = column * (side / 2);
      const y = row * h;
      const up = (row + column) % 2 === 0;
      const points = up
        ? [{ x: x, y: y + h }, { x: x + side / 2, y }, { x: x + side, y: y + h }]
        : [{ x: x, y: y }, { x: x + side, y: y }, { x: x + side / 2, y: y + h }];
      return { points, center: { x: x + side / 2, y: y + h * (up ? 2 / 3 : 1 / 3) } };
    }
    default: {
      const x = column * s;
      const y = row * s;
      return {
        points: [
          { x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s },
        ],
        center: { x: x + s / 2, y: y + s / 2 },
      };
    }
  }
}

function layoutSize(project: Project): { width: number; height: number } {
  const s = CELL_SIZE;
  switch (project.layout.type) {
case "hexagonal": {
  const r = s / 2;
  const w = Math.sqrt(3) * r;
  const h = 2 * r;

  return {
    // Width: full width of all columns + half width for offset rows
    width: project.layout.columns * w + w / 2,
    
    // Height: (N - 1) row steps + the full height of one hexagon
    height: (project.layout.rows - 1) * (1.5 * r) + h,
  };
}
    case "triangular": {
      const h = s * Math.sqrt(3) / 2;
      return {
        width: project.layout.columns * s / 2 + s / 2,
        height: project.layout.rows * h,
      };
    }
    case "octagonal":
    default:
      return { width: project.layout.columns * s, height: project.layout.rows * s };
  }
}

/**
 * Size of the whole canvas in native (zoom- and DPR-independent) units: the board plus
 * the margin on every side. This is the single source of truth — renderGrid sizes the
 * canvas from it, getCellAtPoint maps clicks with it, and main.ts uses it for zoom/fit —
 * so none of them have to derive it (and drift) from canvas.width, which varies with the
 * render scale.
 */
export function nativeCanvasSize(project: Project): { width: number; height: number } {
  const size = layoutSize(project);
  return {
    width: Math.ceil(size.width + CANVAS_MARGIN * 2),
    height: Math.ceil(size.height + CANVAS_MARGIN * 2),
  };
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Tight bounding box around cells that actually have something in them — a motif, or
 * deliberate EMPTY negative space — excluding cells that are simply unfilled. Used to crop
 * exports down to the actual pattern instead of the whole board. Returns null if nothing
 * has been placed at all.
 *
 * The box is in *canvas* native units (i.e. it already includes CANVAS_MARGIN), because it
 * is used to crop a rendered canvas, not to describe board geometry.
 */
export function contentBounds(
  project: Project,
  padding = 8,
): { x: number; y: number; width: number; height: number } | null {
  const contentCells = project.cells.filter((cell) => cell.motifId || cell.isEmpty);
  if (contentCells.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cell of contentCells) {
    const { points } = cellGeometry(project, cell);
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  const full = nativeCanvasSize(project);
  const x = Math.max(0, minX + CANVAS_MARGIN - padding);
  const y = Math.max(0, minY + CANVAS_MARGIN - padding);
  const right = Math.min(full.width, maxX + CANVAS_MARGIN + padding);
  const bottom = Math.min(full.height, maxY + CANVAS_MARGIN + padding);

  return { x, y, width: right - x, height: bottom - y };
}

export function getCellAtPoint(
  canvas: HTMLCanvasElement,
  project: Project,
  clientX: number,
  clientY: number,
): string | null {
  const rect = canvas.getBoundingClientRect();

  // Map CSS-space click coordinates to native board coordinates: scale by native size over
  // displayed size (independent of zoom and of canvas.width, which includes the render
  // scale), then remove the margin the board is drawn offset by.
  const native = nativeCanvasSize(project);
  const point = {
    x: (clientX - rect.left) * (native.width / rect.width) - CANVAS_MARGIN,
    y: (clientY - rect.top) * (native.height / rect.height) - CANVAS_MARGIN,
  };

  // Reverse order is useful at the boundaries where cells overlap visually.
  for (let i = project.cells.length - 1; i >= 0; i--) {
    const cell = project.cells[i];
    if (pointInPolygon(point, cellGeometry(project, cell).points)) return cell.id;
  }
  return null;
}

export function renderGrid(
  canvas: HTMLCanvasElement,
  project: Project,
  selectedCellIds = new Set<string>(),
  options: { forExport?: boolean; scale?: number } = {},
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // `scale` renders at a higher pixel density than the on-screen editing view (used for
  // export). It only affects canvas resolution, not any layout/geometry math below, which
  // still works in native CELL_SIZE units — ctx.scale() maps those up automatically.
  const scale = options.scale ?? 1;
  const native = nativeCanvasSize(project);
  canvas.width = Math.round(native.width * scale);
  canvas.height = Math.round(native.height * scale);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(CANVAS_MARGIN, CANVAS_MARGIN);

  for (const cell of project.cells) {
    const { points, center } = cellGeometry(project, cell);
    const selected = selectedCellIds.has(cell.id);

    // Base fill: white under a motif (or in an export), otherwise the placeholder
    // background that distinguishes EMPTY from not-yet-filled (see getEmptyPattern).
    ctx.save();
    polygonPath(ctx, points);
    if (cell.motifId || options.forExport) {
      ctx.fillStyle = "#ffffff";
    } else if (cell.isEmpty) {
      ctx.fillStyle = getEmptyPattern(ctx);
    } else {
      ctx.fillStyle = "#f7f7f7"; // unfilled / not yet placed
    }
    ctx.fill();
    ctx.restore();

    // Motif artwork, clipped to the cell.
    if (cell.motifId) {
      const motif = project.motifs.find((m) => m.id === cell.motifId);
      if (motif) {
        const img = getMotifImage(motif, () => renderGrid(canvas, project, selectedCellIds, options));
        if (img) {
          ctx.save();
          polygonPath(ctx, points);
          ctx.clip();
          const minX = Math.min(...points.map(p => p.x));
          const maxX = Math.max(...points.map(p => p.x));
          const minY = Math.min(...points.map(p => p.y));
          const maxY = Math.max(...points.map(p => p.y));
          const width = maxX - minX;
          const height = maxY - minY;
          const scale = Math.min(width / motif.width, height / motif.height);
          const dw = motif.width * scale;
          const dh = motif.height * scale;
          ctx.drawImage(img, center.x - dw / 2, center.y - dh / 2, dw, dh);
          ctx.restore();
        }
      }
    }

    // Color tint: a translucent wash drawn OVER whatever is already in the cell (motif
    // or placeholder), so it works whether or not the cell has a motif. "White" (#ffffff)
    // is the default and means "no color chosen" -> no overlay is drawn at all.
    if (cell.tint && cell.tint.toLowerCase() !== "#ffffff") {
      ctx.save();
      polygonPath(ctx, points);
      ctx.clip();
      ctx.fillStyle = cell.tint;
      ctx.globalAlpha = cell.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Cell borders and the selection outline are editing aids only; left out of exports.
    if (!options.forExport) {
      ctx.save();
      polygonPath(ctx, points);
      ctx.strokeStyle = selected ? "#1976d2" : "#c7c7c7";
      ctx.lineWidth = selected ? 3 : 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * Ensures every motif currently used in the grid has its image decoded and cached before
 * doing a synchronous export render. Without this, a motif whose image hasn't finished
 * loading yet would simply be skipped (blank cell) in the exported file.
 */
export function preloadMotifImages(project: Project): Promise<void> {
  const usedIds = new Set(
    project.cells.map((cell) => cell.motifId).filter((id): id is string => Boolean(id)),
  );
  const motifs = project.motifs.filter((m) => usedIds.has(m.id));

  return Promise.all(
    motifs.map(
      (motif) =>
        new Promise<void>((resolve) => {
          const img = getMotifImage(motif, () => resolve());
          if (img) resolve();
        }),
    ),
  ).then(() => undefined);
}
