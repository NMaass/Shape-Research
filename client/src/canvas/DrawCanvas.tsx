import { useRef, useCallback, useEffect } from 'react';
import type { Point } from 'shape-research-shared';
import { usePointerStroke } from './usePointerStroke';
import { drawStroke, drawLoop, drawShapeOutline, getBBox, fadeStroke } from './strokeRenderer';
import { processShape } from '../pipeline/pipeline';
import { discoverShape } from '../api/client';
import { saveShape } from '../store/localStorage';

const RESULT_DISPLAY_MS = 3000;
const ERROR_DISPLAY_MS = 4000;

export type ResultInfo = {
  label: string;
  isNew: boolean;
} | {
  label: string;
  isError: true;
} | null;

interface DrawCanvasProps {
  onResult?: (result: ResultInfo) => void;
}

export default function DrawCanvas({ onResult }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestIdRef = useRef(0);
  const fadeRef = useRef<(() => void) | null>(null);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeRef.current) fadeRef.current();
    };
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const showResult = useCallback((result: ResultInfo, delayMs: number) => {
    onResult?.(result);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearCanvas();
      onResult?.(null);
    }, delayMs);
  }, [clearCanvas, onResult]);

  const handleStrokeUpdate = useCallback((points: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStroke(ctx, points);
  }, []);

  const handleLoopClosed = useCallback(async (loop: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cancel any pending timer from a previous loop
    if (timerRef.current) clearTimeout(timerRef.current);
    onResult?.(null);

    // Track this request so stale async results are discarded
    const thisRequest = ++requestIdRef.current;

    // Draw the closed loop — it stays visible while we process
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLoop(ctx, loop);

    // Remember the bounding box of the user's drawing
    const bbox = getBBox(loop);

    // Process through pipeline
    let shapeResult;
    try {
      shapeResult = processShape(loop);
    } catch (err) {
      showResult({ label: 'failed to process shape', isError: true }, ERROR_DISPLAY_MS);
      console.error('pipeline error:', err);
      return;
    }

    // Check with server
    let isNew: boolean;
    try {
      const discovery = await discoverShape(shapeResult.hash, shapeResult.raster);
      isNew = discovery.isNew;
    } catch (err) {
      if (thisRequest !== requestIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'unknown error';
      showResult({ label: `server error: ${msg}`, isError: true }, ERROR_DISPLAY_MS);
      // Still show the shape outline even on server error
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawShapeOutline(ctx, shapeResult.drawnRaster, bbox);
      console.error('discovery error:', err);
      return;
    }

    // Discard if a newer loop was closed while we awaited
    if (thisRequest !== requestIdRef.current) return;

    // Save locally if new
    if (isNew) {
      saveShape(shapeResult.hash, shapeResult.raster);
    }

    // Replace the drawn loop with the identified shape outline at the same position
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawShapeOutline(ctx, shapeResult.drawnRaster, bbox);

    showResult({ label: isNew ? 'new shape!' : 'already discovered', isNew }, RESULT_DISPLAY_MS);
  }, [clearCanvas, showResult, onResult]);

  const handleStrokeEnd = useCallback((points: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fadeRef.current = fadeStroke(canvas, points, () => {
      fadeRef.current = null;
    });
  }, []);

  const { handlePointerDown, handlePointerMove, handlePointerUp } =
    usePointerStroke({
      onStrokeUpdate: handleStrokeUpdate,
      onLoopClosed: handleLoopClosed,
      onStrokeEnd: handleStrokeEnd,
    });

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="img"
      aria-label="drawing canvas"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
      }}
    />
  );
}
