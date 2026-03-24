import type { Point } from 'shape-research-shared';

const STROKE_COLOR = '#111';
const STROKE_WIDTH = 3;
const FADE_DURATION = 500;

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  alpha = 1,
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
  ctx.stroke();
  ctx.restore();
}

export function drawLoop(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  alpha = 1,
): void {
  if (points.length < 3) return;

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
  ctx.closePath();
  ctx.stroke();
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
  const renderCtx: CanvasRenderingContext2D = maybeCtx;
  const start = performance.now();
  let animId = 0;

  function frame(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / FADE_DURATION, 1);
    const alpha = 1 - progress;

    renderCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (alpha > 0) {
      drawStroke(renderCtx, points, alpha);
      animId = requestAnimationFrame(frame);
    } else {
      onComplete();
    }
  }

  animId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animId);
}
