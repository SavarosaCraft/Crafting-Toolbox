import type { PatternBoundary } from "../model/motif";
import { transformedPolygon, polygonBounds } from "../model/patternShapes";

/** Cap on the long edge of the internal working copy used for placement/rendering. */
export const MAX_WORKING_DIMENSION = 500;

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image data."));
    image.src = dataUrl;
  });
}

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return loadImageFromDataUrl(dataUrl).then((image) => ({
    width: image.naturalWidth || 1,
    height: image.naturalHeight || 1,
  }));
}

/**
 * Crops the source image to the boundary's (rotated, size-scaled) shape and downscales the
 * result so neither dimension exceeds MAX_WORKING_DIMENSION. This capped, shape-masked copy
 * is what actually gets placed/rendered, regardless of how large the original upload was.
 *
 * The crop rectangle is derived from the *transformed* polygon's own bounds, not the raw
 * boundary.x/y/width/height box — a rotated shape can extend beyond that original box, so
 * sizing the crop off the stored box alone would clip it.
 */
export function cropAndDownscale(
  image: HTMLImageElement,
  boundary: PatternBoundary,
  maxDimension: number = MAX_WORKING_DIMENSION,
): { dataUrl: string; width: number; height: number } {
  const polygon = transformedPolygon(boundary.shape, boundary, boundary.flipped, {
    rotationDeg: boundary.rotationDeg ?? 0,
    sizeScale: boundary.sizeScale ?? 1,
    offsetX: boundary.offsetX ?? 0,
    offsetY: boundary.offsetY ?? 0,
  });
  const bounds = polygonBounds(polygon);

  const longEdge = Math.max(bounds.width, bounds.height);
  const scale = Math.min(1, maxDimension / longEdge);
  const outWidth = Math.max(1, Math.round(bounds.width * scale));
  const outHeight = Math.max(1, Math.round(bounds.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create working canvas for motif downscale.");

  ctx.save();
  ctx.beginPath();
  polygon.forEach((point, i) => {
    const lx = (point.x - bounds.x) * scale;
    const ly = (point.y - bounds.y) * scale;
    if (i === 0) ctx.moveTo(lx, ly);
    else ctx.lineTo(lx, ly);
  });
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    bounds.x, bounds.y, bounds.width, bounds.height,
    0, 0, outWidth, outHeight,
  );
  ctx.restore();

  return { dataUrl: canvas.toDataURL("image/png"), width: outWidth, height: outHeight };
}
