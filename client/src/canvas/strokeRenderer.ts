import type { Point } from 'shape-research-shared';
import { GRID_SIZE } from 'shape-research-shared';
import { rasterToSvgPath } from '../shape/marchingSquares';

const STROKE_COLOR = '#111';
const STROKE_WIDTH = 3;
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
 * Draw the marching-squares outline of an 8×8 raster, scaled to fit the
 * given bounding box on the canvas. Stroked, not filled.
 */
export function drawShapeOutline(
  ctx: CanvasRenderingContext2D,
  raster: number[],
  bbox: BBox,
  alpha = 1,
): void {
  const svgPath = rasterToSvgPath(raster);
  if (!svgPath) return;

  const path = new Path2D(svgPath);
  const cellSize = Math.min(bbox.width, bbox.height) / GRID_SIZE;
  const totalSize = cellSize * GRID_SIZE;
  const offsetX = bbox.x + (bbox.width - totalSize) / 2;
  const offsetY = bbox.y + (bbox.height - totalSize) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(offsetX, offsetY);
  ctx.scale(cellSize, cellSize);
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = STROKE_WIDTH / cellSize;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(path);
  ctx.restore();
}

/**
 * Draw a result label centered below the raster bounding box.
 */
export function drawResultText(
  ctx: CanvasRenderingContext2D,
  text: string,
  bbox: BBox,
): void {
  ctx.save();
  ctx.font = '13px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, bbox.x + bbox.width / 2, bbox.y + bbox.height + 12);
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
