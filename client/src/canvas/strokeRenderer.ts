import type { Point } from 'shape-research-shared';

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
  // Re-bind to a non-nullable const so TypeScript narrows inside the closure
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const start = performance.now();
  let animId = 0;

  function frame(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / FADE_DURATION, 1);
    const alpha = 1 - progress;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (alpha > 0) {
      drawStroke(ctx, points, alpha);
      animId = requestAnimationFrame(frame);
    } else {
      onComplete();
    }
  }

  animId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(animId);
    onComplete();
  };
}
