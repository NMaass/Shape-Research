import type { Point } from 'shape-research-shared';

const STROKE_COLOR = '#222';
const STROKE_WIDTH = 4;
const FADE_DURATION = 500;

function drawPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  closed: boolean,
  alpha: number,
): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();

  // Double-stroke for crayon texture: thinner pass with slight offset
  ctx.globalAlpha = alpha * 0.3;
  ctx.lineWidth = STROKE_WIDTH + 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  alpha = 1,
): void {
  drawPath(ctx, points, false, alpha);
}

export function drawLoop(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  alpha = 1,
): void {
  drawPath(ctx, points, true, alpha);
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the bounding box of a set of points, with optional padding.
 */
export function getBBox(points: Point[], padding = 8): BBox {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Draw a clean geometric shape (reconstructed vertices in [0,1] space)
 * centered in the canvas.
 */
export function drawCleanShape(
  ctx: CanvasRenderingContext2D,
  vertices: Point[],
  alpha = 1,
): void {
  if (vertices.length < 2) return;

  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  // Vertices are in [0,1] unit space. Scale to fit canvas with margin.
  const margin = 40;
  const available = Math.min(canvasW, canvasH) - margin * 2;
  const offsetX = (canvasW - available) / 2;
  const offsetY = (canvasH - available) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.moveTo(offsetX + vertices[0].x * available, offsetY + vertices[0].y * available);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(offsetX + vertices[i].x * available, offsetY + vertices[i].y * available);
  }
  ctx.closePath();

  // Main stroke
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = STROKE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Softer shadow pass
  ctx.globalAlpha = alpha * 0.2;
  ctx.lineWidth = STROKE_WIDTH + 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a result label centered below the raster bounding box.
 */
export function drawResultText(
  ctx: CanvasRenderingContext2D,
  text: string,
  bbox: BBox,
  isNew = false,
): void {
  ctx.save();
  ctx.font = '13px "Courier New", Courier, monospace';
  ctx.fillStyle = isNew ? '#2a9d2a' : '#999';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, bbox.x + bbox.width / 2, bbox.y + bbox.height + 12);
  ctx.restore();
}

/**
 * Draw an error message centered in the canvas.
 */
export function drawErrorText(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.save();
  ctx.font = '13px "Courier New", Courier, monospace';
  ctx.fillStyle = '#c44';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
  ctx.restore();
}

/**
 * Fade a stroke out over FADE_DURATION ms, clearing and redrawing each frame.
 * Calls onComplete when done. Returns a cancel function.
 */
export function fadeStroke(
  canvas: HTMLCanvasElement,
  points: Point[],
  onComplete: () => void,
): () => void {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const start = performance.now();
  let animId = 0;
  let done = false;
  function complete() {
    if (done) return;
    done = true;
    onComplete();
  }

  function frame(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / FADE_DURATION, 1);
    const alpha = 1 - progress;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (alpha > 0) {
      drawStroke(ctx, points, alpha);
      animId = requestAnimationFrame(frame);
    } else {
      complete();
    }
  }

  animId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(animId);
    complete();
  };
}
