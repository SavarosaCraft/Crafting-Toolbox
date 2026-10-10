import type { Project } from "../model/project";
import { renderGrid, preloadMotifImages, contentBounds } from "../render/canvasRenderer";

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string, type: string): void {
  downloadBlob(filename, new Blob([text], { type }));
}

export function saveProject(project: Project): void {
  downloadText(`${safeName(project.name)}.motif.json`, JSON.stringify(project, null, 2), "application/json");
}

/**
 * Renders the project as a flattened JPG, cropped to the tight bounding box of cells
 * that actually have something in them (a motif, or deliberate EMPTY negative space) —
 * not-yet-filled cells beyond that don't pad out the export. JPG is the only export
 * format for now — no PNG or SVG export is planned. Cell borders, the selection outline,
 * and the EMPTY checkerboard are editing aids only, so the exported image leaves them
 * out: EMPTY and not-yet-filled cells both simply render as blank/white.
 *
 * `scale` renders at a higher pixel density than the on-screen editing canvas (which
 * stays at native CELL_SIZE resolution so editing/zooming stays fast). Default of 4
 * means each cell renders at 256px instead of 64px — reasonable for print, not just
 * screen viewing. Bump this (or expose it as a user-facing control later, per the
 * spec's planned Resolution/DPI settings) if you need it sharper still.
 */
export async function exportJpg(project: Project, options: { scale?: number; quality?: number } = {}): Promise<void> {
  const { scale = 4, quality = 0.92 } = options;
  await preloadMotifImages(project);

  const fullCanvas = document.createElement("canvas");
  renderGrid(fullCanvas, project, new Set(), { forExport: true, scale });

  // Nothing placed at all -> fall back to exporting the full (blank) canvas rather than
  // failing outright.
  const bounds = contentBounds(project);
  let outputCanvas = fullCanvas;
  if (bounds) {
    const cropped = document.createElement("canvas");
    cropped.width = Math.max(1, Math.round(bounds.width * scale));
    cropped.height = Math.max(1, Math.round(bounds.height * scale));
    const ctx = cropped.getContext("2d");
    if (ctx) {
      ctx.drawImage(
        fullCanvas,
        Math.round(bounds.x * scale), Math.round(bounds.y * scale),
        cropped.width, cropped.height,
        0, 0, cropped.width, cropped.height,
      );
      outputCanvas = cropped;
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => outputCanvas.toBlob(resolve, "image/jpeg", quality));
  if (blob) downloadBlob(`${safeName(project.name)}.jpg`, blob);
}

function safeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "motif-project";
}
