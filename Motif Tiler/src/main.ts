import "./styles.css";
import { createProject, createCells, resizeCells, type Project } from "./model/project";
import type { LayoutType } from "./model/layout";
import { getCellAtPoint, nativeCanvasSize, renderGrid } from "./render/canvasRenderer";
import { exportJpg, saveProject } from "./io/projectFile";
import { cropAndDownscale, getImageDimensions, loadImageFromDataUrl } from "./io/imageProcessing";
import { openMotifBoundaryEditor } from "./ui/motifBoundaryEditor";

const DELETE_ID = "__DELETE__";
const EMPTY_ID = "__EMPTY__";
const WHITE_COLOR_ID = "__WHITE__";
const COLOR_OVERLAY_ALPHA = 0.3;

let project: Project = createProject();
let history: Project[] = [];
let future: Project[] = [];
let selectedCellIds = new Set<string>();

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <header class="toolbar">
    <div class="brand">Motif Tiler</div>
    <button id="new">New</button>
    <button id="open">Open</button>
    <button id="save">Save</button>
    <button id="import">Import Motif</button>
    <button id="exportJpg">Export JPG</button>
    <span class="separator"></span>
    <button id="undo">Undo</button>
    <button id="redo">Redo</button>
  </header>
  <main class="workspace">
    <aside class="sidebar">
      <h2>Motifs</h2>
      <button id="importSide">+ Import Motif</button>
      <div id="motifList" class="motif-list"></div>
      <div class="selection-help">Click a cell to select it; Shift/Ctrl-click adds or removes cells from the selection. Press Esc to clear the selection. Then click EMPTY or a motif below to apply it to the selected cells.</div>
      <hr />
      <h2>Colors</h2>
      <div id="colorList" class="color-list"></div>
      <div class="selection-help">With cells selected, click White (no color) or a swatch to tint them as a translucent overlay. Use + to pick a new color and apply it.</div>
      <hr />
      <label>Layout
        <select id="layout">
          <option value="rectangular">Rectangular (4.4.4.4)</option>
          <option value="triangular">Triangular (3.3.3.3.3.3)</option>
          <option value="hexagonal">Hexagonal (6.6.6)</option>
          <option value="octagonal">Octagons + squares (4.8.8)</option>
        </select>
      </label>
      <div class="resize-board">
        <div class="resize-fields">
          <label>Columns <input id="colsInput" type="number" min="1" max="60" value="10" /></label>
          <label>Rows <input id="rowsInput" type="number" min="1" max="60" value="8" /></label>
        </div>
        <button id="resizeBoard">Resize Board</button>
      </div>
    </aside>
    <section class="canvas-area">
      <div class="canvas-header"><span id="status">Empty rectangular layout</span></div>
      <div class="canvas-row">
        <div class="canvas-scroll" id="canvasScroll"><canvas id="canvas"></canvas></div>
        <div class="zoom-controls">
          <button id="zoomIn" title="Zoom in">+</button>
          <input id="zoomSlider" type="range" min="25" max="400" step="5" value="100" />
          <button id="zoomOut" title="Zoom out">−</button>
          <div id="zoomLabel" class="zoom-label">100%</div>
          <button id="zoomFit" class="zoom-fit" title="Fit to canvas">Fit</button>
        </div>
      </div>
    </section>
  </main>
  <input id="fileInput" type="file" accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml" hidden />
  <input id="projectInput" type="file" accept=".json,.motif.json,application/json" hidden />
  <input id="colorPicker" type="color" value="#c96b8f" hidden />
`;

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const canvasScroll = document.querySelector<HTMLDivElement>("#canvasScroll")!;
const status = document.querySelector<HTMLSpanElement>("#status")!;
const motifList = document.querySelector<HTMLDivElement>("#motifList")!;
const colorList = document.querySelector<HTMLDivElement>("#colorList")!;
const colorPicker = document.querySelector<HTMLInputElement>("#colorPicker")!;
const layoutSelect = document.querySelector<HTMLSelectElement>("#layout")!;
const colsInput = document.querySelector<HTMLInputElement>("#colsInput")!;
const rowsInput = document.querySelector<HTMLInputElement>("#rowsInput")!;
const resizeBoardBtn = document.querySelector<HTMLButtonElement>("#resizeBoard")!;
const fileInput = document.querySelector<HTMLInputElement>("#fileInput")!;
const projectInput = document.querySelector<HTMLInputElement>("#projectInput")!;
const zoomSlider = document.querySelector<HTMLInputElement>("#zoomSlider")!;
const zoomLabel = document.querySelector<HTMLDivElement>("#zoomLabel")!;
const zoomInBtn = document.querySelector<HTMLButtonElement>("#zoomIn")!;
const zoomOutBtn = document.querySelector<HTMLButtonElement>("#zoomOut")!;
const zoomFitBtn = document.querySelector<HTMLButtonElement>("#zoomFit")!;

function snapshot(): void {
  history.push(structuredClone(project));
  if (history.length > 100) history.shift();
  future = [];
}

function render(): void {
  redrawCanvas();
  motifList.innerHTML = [
    `<button class="motif-item delete-option" data-motif-id="${DELETE_ID}"><strong>Delete Cell</strong><small>Clear motif &amp; color</small></button>`,
    `<button class="motif-item empty-option" data-motif-id="${EMPTY_ID}"><strong>EMPTY</strong><small>Negative space</small></button>`,
    ...project.motifs.map((m) => `<button class="motif-item" data-motif-id="${m.id}"><strong>${escapeHtml(m.name)}</strong><small>${m.width} × ${m.height}</small></button>`),
  ].join("");
  colorList.innerHTML = [
    `<button class="color-swatch white-swatch" data-color-id="${WHITE_COLOR_ID}" title="White (no color)"></button>`,
    ...project.palette.map((hex) => `<button class="color-swatch" style="background:${hex}" data-color-id="${hex}" title="${hex}"></button>`),
    `<button class="color-swatch add-swatch" data-action="addColor" title="Add color">+</button>`,
  ].join("");
  status.textContent = `${project.layout.type} · ${project.layout.columns} × ${project.layout.rows} · ${selectedCellIds.size} selected`;
  layoutSelect.value = project.layout.type;
  colsInput.value = String(project.layout.columns);
  rowsInput.value = String(project.layout.rows);
}

function applyToSelection(motifId: string): void {
  if (selectedCellIds.size === 0) return;
  snapshot();
  for (const cell of project.cells) {
    if (!selectedCellIds.has(cell.id)) continue;
    if (motifId === DELETE_ID) {
      // Delete Cell resets everything: motif, EMPTY flag, and any color tint — a fully
      // blank/unfilled cell, not just "no motif" (which EMPTY also produces).
      cell.motifId = null;
      cell.isEmpty = false;
      cell.tint = "#ffffff";
      cell.alpha = 1;
      continue;
    }
    cell.motifId = motifId === EMPTY_ID ? null : motifId;
    cell.isEmpty = motifId === EMPTY_ID;
  }
}

function applyColorToSelection(colorId: string): void {
  if (selectedCellIds.size === 0) return;
  snapshot();
  for (const cell of project.cells) {
    if (!selectedCellIds.has(cell.id)) continue;
    cell.tint = colorId === WHITE_COLOR_ID ? "#ffffff" : colorId;
    cell.alpha = colorId === WHITE_COLOR_ID ? 1 : COLOR_OVERLAY_ALPHA;
  }
}

// --- Canvas zoom -----------------------------------------------------------
// Still a pure viewport control in the sense that it never touches the project's
// cells/geometry or the tessellation dimensions. But zooming in on a canvas whose pixel
// buffer never changes just stretches existing low-res pixels (blurry) — so instead we
// re-render the canvas's pixel buffer at a resolution that accounts for zoom level and
// device pixel ratio, and only use CSS width/height to place it at the correct on-screen
// size. `nativeSize` tracks the "1x, zoom-independent" size so fitToCanvas and the zoom
// math have something stable to divide by, since canvas.width itself now varies with zoom.
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;
let zoomPercent = 100;
let nativeSize = { width: 0, height: 0 };

function currentRenderScale(): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, (zoomPercent / 100) * dpr);
}

function redrawCanvas(): void {
  const scale = currentRenderScale();
  renderGrid(canvas, project, selectedCellIds, { scale });
  nativeSize = nativeCanvasSize(project);
  canvas.style.width = `${nativeSize.width * (zoomPercent / 100)}px`;
  canvas.style.height = `${nativeSize.height * (zoomPercent / 100)}px`;
  zoomSlider.value = String(zoomPercent);
  zoomLabel.textContent = `${Math.round(zoomPercent)}%`;
}

/**
 * Changes zoom while keeping whatever point is under `anchorClient` (a clientX/clientY
 * viewport point) visually fixed in place, rather than the view jumping back to the
 * top-left corner. Defaults to the center of the visible scroll area when no specific
 * point is given (e.g. from the slider or +/- buttons).
 */
function setZoom(newPercent: number, anchorClient?: { x: number; y: number }): void {
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(newPercent)));
  if (clamped === zoomPercent) return;

  const rect = canvasScroll.getBoundingClientRect();
  const anchorX = anchorClient ? anchorClient.x - rect.left : rect.width / 2;
  const anchorY = anchorClient ? anchorClient.y - rect.top : rect.height / 2;

  // The canvas-space point currently under the anchor, independent of zoom level.
  const oldScale = zoomPercent / 100;
  const pointX = (canvasScroll.scrollLeft + anchorX) / oldScale;
  const pointY = (canvasScroll.scrollTop + anchorY) / oldScale;

  zoomPercent = clamped;
  redrawCanvas();

  const newScale = zoomPercent / 100;
  canvasScroll.scrollLeft = pointX * newScale - anchorX;
  canvasScroll.scrollTop = pointY * newScale - anchorY;
}

function fitToCanvas(): void {
  // Available room = the scroll area's full box minus its own padding. (Using clientWidth
  // would shrink whenever a scrollbar happens to be showing, and forgetting the padding is
  // what made the old Fit overshoot and leave the board partly off-screen.)
  const box = canvasScroll.getBoundingClientRect();
  const style = getComputedStyle(canvasScroll);
  const availableWidth = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const availableHeight = box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

  // Floor so rounding can never push the board a pixel past the edge and bring scrollbars back.
  const fit = Math.floor(Math.min(availableWidth / nativeSize.width, availableHeight / nativeSize.height) * 100);
  setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit)));

  // Bring the board into view even when the zoom level didn't change.
  canvasScroll.scrollLeft = 0;
  canvasScroll.scrollTop = 0;
}

zoomSlider.addEventListener("input", () => setZoom(Number(zoomSlider.value)));
zoomInBtn.addEventListener("click", () => setZoom(zoomPercent + 25));
zoomOutBtn.addEventListener("click", () => setZoom(zoomPercent - 25));
zoomFitBtn.addEventListener("click", () => fitToCanvas());

// Ctrl/Cmd + scroll wheel zooms centered on the cursor, matching the spec's preference
// for cursor-anchored zooming over always recentering on the viewport.
canvasScroll.addEventListener(
  "wheel",
  (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const step = event.deltaY < 0 ? 10 : -10;
    setZoom(zoomPercent + step, { x: event.clientX, y: event.clientY });
  },
  { passive: false },
);

motifList.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const item = target.closest<HTMLButtonElement>("[data-motif-id]");
  if (!item) return;

  const motifId = item.dataset.motifId ?? null;
  if (!motifId) return;

  applyToSelection(motifId);
  render();
});

colorList.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  if (target.closest("[data-action='addColor']")) {
    colorPicker.click();
    return;
  }

  const item = target.closest<HTMLButtonElement>("[data-color-id]");
  if (!item) return;
  const colorId = item.dataset.colorId!;

  applyColorToSelection(colorId);
  render();
});

colorPicker.addEventListener("change", () => {
  const hex = colorPicker.value;
  snapshot();
  if (!project.palette.includes(hex)) project.palette.push(hex);
  for (const cell of project.cells) {
    if (!selectedCellIds.has(cell.id)) continue;
    cell.tint = hex;
    cell.alpha = COLOR_OVERLAY_ALPHA;
  }
  render();
});

canvas.addEventListener("click", (event) => {
  const cellId = getCellAtPoint(canvas, project, event.clientX, event.clientY);
  if (!cellId) return;

  if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd-click: toggle this cell — the way to deselect one cell out of a selection.
    if (selectedCellIds.has(cellId)) selectedCellIds.delete(cellId);
    else selectedCellIds.add(cellId);
  } else if (event.shiftKey) {
    // Shift-click: add to the selection (never removes).
    selectedCellIds.add(cellId);
  } else {
    // Plain click: replace the selection with just this cell.
    selectedCellIds.clear();
    selectedCellIds.add(cellId);
  }
  render();
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]!));
}

function triggerImport(): void { fileInput.click(); }

document.querySelector("#import")!.addEventListener("click", triggerImport);
document.querySelector("#importSide")!.addEventListener("click", triggerImport);
document.querySelector("#save")!.addEventListener("click", () => saveProject(project));
document.querySelector("#exportJpg")!.addEventListener("click", () => { void exportJpg(project); });
document.querySelector("#open")!.addEventListener("click", () => projectInput.click());

document.querySelector("#new")!.addEventListener("click", () => {
  snapshot();
  project = createProject();
  selectedCellIds.clear();
  render();
});

document.querySelector("#undo")!.addEventListener("click", () => {
  const previous = history.pop();
  if (!previous) return;
  future.push(structuredClone(project));
  project = previous;
  selectedCellIds.clear();
  render();
});

document.querySelector("#redo")!.addEventListener("click", () => {
  const next = future.pop();
  if (!next) return;
  history.push(structuredClone(project));
  project = next;
  selectedCellIds.clear();
  render();
});

layoutSelect.addEventListener("change", () => {
  snapshot();
  project.layout.type = layoutSelect.value as LayoutType;
  project.cells = createCells(project.layout.type, project.layout.rows, project.layout.columns);
  selectedCellIds.clear();
  render();
});

resizeBoardBtn.addEventListener("click", () => {
  const newColumns = Math.max(1, Math.min(60, Math.round(Number(colsInput.value)) || project.layout.columns));
  const newRows = Math.max(1, Math.min(60, Math.round(Number(rowsInput.value)) || project.layout.rows));
  if (newColumns === project.layout.columns && newRows === project.layout.rows) return;

  snapshot();
  project.cells = resizeCells(project.cells, project.layout.type, newRows, newColumns);
  project.layout.columns = newColumns;
  project.layout.rows = newRows;
  selectedCellIds.clear();
  render();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;

  const sourceType = file.type === "image/svg+xml" ? "svg" : file.type === "image/png" ? "png" : "jpg";
  const sourceDataUrl = await readAsDataUrl(file);
  const sourceDimensions = await getImageDimensions(sourceDataUrl);

  // Upload is accepted at whatever size it is. The user marks the usable area on the
  // full-size original, then we crop to that boundary and downscale for internal use
  // (placement + on-canvas rendering) so a huge source file never gets decoded/drawn
  // at full resolution across every cell that uses it.
  const boundary = await openMotifBoundaryEditor(sourceDataUrl, sourceDimensions.width, sourceDimensions.height);
  if (!boundary) return; // user cancelled the import

  const sourceImage = await loadImageFromDataUrl(sourceDataUrl);
  const working = cropAndDownscale(sourceImage, boundary);

  snapshot();
  project.motifs.push({
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ""),
    sourceType,
    sourceDataUrl,
    sourceWidth: sourceDimensions.width,
    sourceHeight: sourceDimensions.height,
    patternBoundary: boundary,
    dataUrl: working.dataUrl,
    width: working.width,
    height: working.height,
  });
  render();
});

projectInput.addEventListener("change", async () => {
  const file = projectInput.files?.[0];
  projectInput.value = "";
  if (!file) return;
  const loaded = JSON.parse(await file.text()) as Project;
  if (loaded?.version !== 1 || !Array.isArray(loaded.cells) || !loaded.layout) {
    alert("This does not appear to be a Motif Tiler project.");
    return;
  }
  // Projects saved before EMPTY got its own flag only have motifId; treat those as unfilled.
  for (const cell of loaded.cells) {
    if (typeof cell.isEmpty !== "boolean") cell.isEmpty = false;
  }
  // Projects saved before the color palette existed won't have this field at all.
  if (!Array.isArray(loaded.palette)) loaded.palette = [];
  snapshot();
  project = loaded;
  selectedCellIds.clear();
  layoutSelect.value = project.layout.type;
  render();
});

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selectedCellIds.size > 0) {
    selectedCellIds.clear();
    render();
  }
});

render();
