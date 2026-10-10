import type { PatternBoundary } from "../model/motif";
import { transformedPolygon, type BoundaryShape, type Point } from "../model/patternShapes";

const DISPLAY_MAX = 480;

interface Rect { x: number; y: number; width: number; height: number; }

/**
 * Shows the original upload and lets the user drag out the pattern boundary (the
 * usable motif area), choose its shape, and fine-tune it with Size/Rotation sliders.
 * Resolves with the boundary in SOURCE image pixel coordinates, or null if the user
 * cancels the import entirely.
 */
export function openMotifBoundaryEditor(
  sourceDataUrl: string,
  sourceWidth: number,
  sourceHeight: number,
): Promise<PatternBoundary | null> {
  return new Promise((resolve) => {
    const displayScale = Math.min(1, DISPLAY_MAX / Math.max(sourceWidth, sourceHeight));
    const displayWidth = Math.round(sourceWidth * displayScale);
    const displayHeight = Math.round(sourceHeight * displayScale);

    const overlay = document.createElement("div");
    overlay.className = "boundary-editor-overlay";
    overlay.innerHTML = `
      <div class="boundary-editor">
        <h3>Select usable pattern area</h3>
        <p class="boundary-editor-help">Drag on the image to mark the area to use. The rest is discarded from the working copy.</p>
        <div class="boundary-editor-shapes">
          <span class="boundary-editor-shapes-label">Shape:</span>
          <button type="button" data-shape="rectangle" class="shape-btn selected">Rectangle</button>
          <button type="button" data-shape="square" class="shape-btn">Square</button>
          <button type="button" data-shape="triangle" class="shape-btn">Triangle</button>
          <button type="button" data-shape="hexagon" class="shape-btn">Hexagon</button>
          <button type="button" data-shape="octagon" class="shape-btn">Octagon</button>
          <button type="button" data-action="flip" class="shape-btn" hidden>Flip</button>
        </div>
        <div class="boundary-editor-body">
          <div class="boundary-editor-canvas-wrap">
            <canvas class="boundary-editor-canvas" width="${displayWidth}" height="${displayHeight}"></canvas>
          </div>
          <div class="boundary-editor-side-controls">
            <label class="slider-control">
              Size <span data-readout="size">100%</span>
              <input type="range" min="40" max="100" value="100" step="1" data-control="size" />
            </label>
            <label class="slider-control">
              Rotation <span data-readout="rotation">0°</span>
              <input type="range" min="-180" max="180" value="0" step="1" data-control="rotation" />
            </label>
            <label class="slider-control">
              Offset X <span data-readout="offsetX">0%</span>
              <input type="range" min="-100" max="100" value="0" step="1" data-control="offsetX" />
            </label>
            <label class="slider-control">
              Offset Y <span data-readout="offsetY">0%</span>
              <input type="range" min="-100" max="100" value="0" step="1" data-control="offsetY" />
            </label>
          </div>
        </div>
        <div class="boundary-editor-actions">
          <button type="button" data-action="full">Full Image</button>
          <span class="spacer"></span>
          <button type="button" data-action="cancel">Cancel Import</button>
          <button type="button" data-action="confirm">Use Selection</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector<HTMLCanvasElement>(".boundary-editor-canvas")!;
    const ctx = canvas.getContext("2d")!;
    const image = new Image();
    const flipButton = overlay.querySelector<HTMLButtonElement>("[data-action='flip']")!;
    const sizeSlider = overlay.querySelector<HTMLInputElement>("[data-control='size']")!;
    const rotationSlider = overlay.querySelector<HTMLInputElement>("[data-control='rotation']")!;
    const offsetXSlider = overlay.querySelector<HTMLInputElement>("[data-control='offsetX']")!;
    const offsetYSlider = overlay.querySelector<HTMLInputElement>("[data-control='offsetY']")!;
    const sizeReadout = overlay.querySelector<HTMLElement>("[data-readout='size']")!;
    const rotationReadout = overlay.querySelector<HTMLElement>("[data-readout='rotation']")!;
    const offsetXReadout = overlay.querySelector<HTMLElement>("[data-readout='offsetX']")!;
    const offsetYReadout = overlay.querySelector<HTMLElement>("[data-readout='offsetY']")!;

    let shape: BoundaryShape = "rectangle";
    let flipped = false;
    let sizeScale = 1;
    let rotationDeg = 0;
    // Offsets are stored as -100..100, meaning +/- half the selection box's own
    // width/height, so the slider stays meaningful regardless of how big the drag was.
    let offsetXPercent = 0;
    let offsetYPercent = 0;
    let selection: Rect = { x: 0, y: 0, width: displayWidth, height: displayHeight };
    let dragging = false;
    let dragStart = { x: 0, y: 0 };

    function clampSelection(): void {
      selection.x = Math.max(0, Math.min(selection.x, displayWidth));
      selection.y = Math.max(0, Math.min(selection.y, displayHeight));
      selection.width = Math.max(4, Math.min(selection.width, displayWidth - selection.x));
      selection.height = Math.max(4, Math.min(selection.height, displayHeight - selection.y));
    }

    function currentPolygon(): Point[] {
      return transformedPolygon(shape, selection, flipped, {
        rotationDeg,
        sizeScale,
        offsetX: (offsetXPercent / 100) * (selection.width / 2),
        offsetY: (offsetYPercent / 100) * (selection.height / 2),
      });
    }

    function tracePath(points: Point[]): void {
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
    }

    function draw(): void {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

      const polygon = currentPolygon();

      // Dim everything, then re-reveal only the (possibly rotated/shrunk) shape. Revealing
      // is done by re-drawing the whole image under the clip, rather than a sub-rectangle
      // copy, so a rotated shape that pokes outside the original drag box is never clipped.
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      ctx.save();
      tracePath(polygon);
      ctx.clip();
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
      ctx.restore();

      tracePath(polygon);
      ctx.strokeStyle = "#1976d2";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function pointFromEvent(event: MouseEvent): { x: number; y: number } {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onMouseDown(event: MouseEvent): void {
      dragging = true;
      dragStart = pointFromEvent(event);
      selection = { x: dragStart.x, y: dragStart.y, width: 0, height: 0 };
    }

    function onMouseMove(event: MouseEvent): void {
      if (!dragging) return;
      const point = pointFromEvent(event);
      selection = {
        x: Math.min(dragStart.x, point.x),
        y: Math.min(dragStart.y, point.y),
        width: Math.abs(point.x - dragStart.x),
        height: Math.abs(point.y - dragStart.y),
      };
      clampSelection();
      draw();
    }

    function onMouseUp(): void {
      if (!dragging) return;
      dragging = false;
      // A near-zero drag is treated as "no selection made" -> fall back to full image.
      if (selection.width < 4 || selection.height < 4) {
        selection = { x: 0, y: 0, width: displayWidth, height: displayHeight };
        draw();
      }
    }

    function resetSliders(): void {
      sizeScale = 1;
      rotationDeg = 0;
      offsetXPercent = 0;
      offsetYPercent = 0;
      sizeSlider.value = "100";
      rotationSlider.value = "0";
      offsetXSlider.value = "0";
      offsetYSlider.value = "0";
      sizeReadout.textContent = "100%";
      rotationReadout.textContent = "0°";
      offsetXReadout.textContent = "0%";
      offsetYReadout.textContent = "0%";
    }

    function cleanup(): void {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      overlay.remove();
    }

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    sizeSlider.addEventListener("input", () => {
      sizeScale = Number(sizeSlider.value) / 100;
      sizeReadout.textContent = `${sizeSlider.value}%`;
      draw();
    });

    rotationSlider.addEventListener("input", () => {
      rotationDeg = Number(rotationSlider.value);
      rotationReadout.textContent = `${rotationDeg}°`;
      draw();
    });

    offsetXSlider.addEventListener("input", () => {
      offsetXPercent = Number(offsetXSlider.value);
      offsetXReadout.textContent = `${offsetXPercent}%`;
      draw();
    });

    offsetYSlider.addEventListener("input", () => {
      offsetYPercent = Number(offsetYSlider.value);
      offsetYReadout.textContent = `${offsetYPercent}%`;
      draw();
    });

    overlay.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const shapeChoice = target.dataset?.shape as BoundaryShape | undefined;
      if (shapeChoice) {
        shape = shapeChoice;
        overlay.querySelectorAll<HTMLButtonElement>(".shape-btn[data-shape]").forEach((btn) => {
          btn.classList.toggle("selected", btn.dataset.shape === shapeChoice);
        });
        flipButton.hidden = shapeChoice !== "triangle";
        draw();
        return;
      }

      const action = target.dataset?.action;
      if (!action) return;

      if (action === "flip") {
        flipped = !flipped;
        draw();
        return;
      }
      if (action === "full") {
        selection = { x: 0, y: 0, width: displayWidth, height: displayHeight };
        resetSliders();
        draw();
        return;
      }
      if (action === "cancel") {
        cleanup();
        resolve(null);
        return;
      }
      if (action === "confirm") {
        const boundary: PatternBoundary = {
          shape,
          flipped: shape === "triangle" ? flipped : undefined,
          rotationDeg,
          sizeScale,
          offsetX: ((offsetXPercent / 100) * (selection.width / 2)) / displayScale,
          offsetY: ((offsetYPercent / 100) * (selection.height / 2)) / displayScale,
          x: Math.round(selection.x / displayScale),
          y: Math.round(selection.y / displayScale),
          width: Math.round(selection.width / displayScale),
          height: Math.round(selection.height / displayScale),
        };
        cleanup();
        resolve(boundary);
      }
    });

    image.onload = () => draw();
    image.src = sourceDataUrl;
  });
}
