import { useRef, useCallback, useEffect } from 'react';
import type { Point } from 'shape-research-shared';
import type { DiscoverResult } from 'shape-research-shared';
import { usePointerStroke } from './usePointerStroke';
import { drawStroke, drawLoop, drawCleanShape, fadeStroke } from './strokeRenderer';
import { processShape } from '../pipeline/pipeline';
import { discoverShape } from '../api/client';
import { saveShape, recordDiscovery } from '../store/localStorage';
import type { PersonalStats } from '../store/localStorage';

const RESULT_DISPLAY_MS = 5000;
const ERROR_DISPLAY_MS = 4000;

export type ResultInfo = {
  discovery: DiscoverResult;
  stats: PersonalStats;
} | {
  error: string;
} | null;

interface DrawCanvasProps {
  onResult?: (result: ResultInfo) => void;
}

export default function DrawCanvas({ onResult }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestIdRef = useRef(0);
  const fadeRef = useRef<(() => void) | null>(null);

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

    if (timerRef.current) clearTimeout(timerRef.current);
    onResult?.(null);

    const thisRequest = ++requestIdRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLoop(ctx, loop);

    let shapeResult;
    try {
      shapeResult = processShape(loop);
    } catch (err) {
      showResult({ error: 'failed to process shape' }, ERROR_DISPLAY_MS);
      console.error('pipeline error:', err);
      return;
    }

    let discovery: DiscoverResult;
    try {
      discovery = await discoverShape(shapeResult.hash, shapeResult.descriptor);
    } catch (err) {
      if (thisRequest !== requestIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'unknown error';
      showResult({ error: `server error: ${msg}` }, ERROR_DISPLAY_MS);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCleanShape(ctx, shapeResult.drawnVertices);
      console.error('discovery error:', err);
      return;
    }

    if (thisRequest !== requestIdRef.current) return;

    if (discovery.isNew) {
      saveShape(shapeResult.hash, shapeResult.descriptor);
    }

    const stats = recordDiscovery(discovery.isNew);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCleanShape(ctx, shapeResult.drawnVertices);

    showResult({ discovery, stats }, RESULT_DISPLAY_MS);
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
