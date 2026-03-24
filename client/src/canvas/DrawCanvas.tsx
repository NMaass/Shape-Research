import { useRef, useCallback, useEffect, useState } from 'react';
import type { Point } from 'shape-research-shared';
import { usePointerStroke } from './usePointerStroke';
import { drawStroke, drawLoop, fadeStroke } from './strokeRenderer';
import { processShape } from '../pipeline/pipeline';
import { discoverShape } from '../api/client';
import { saveShape } from '../store/localStorage';
import FittedShape from '../shape/FittedShape';

const RESULT_DISPLAY_MS = 3000;

interface ResultState {
  isNew: boolean;
  raster: number[];
  hash: string;
}

export default function DrawCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<ResultState | null>(null);
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

    // Track this request so stale async results are discarded
    const thisRequest = ++requestIdRef.current;

    // Draw the closed loop
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLoop(ctx, loop);

    // Process through pipeline
    const shapeResult = processShape(loop);

    // Check with server and save locally
    const discovery = await discoverShape(shapeResult.hash, shapeResult.raster);

    // Discard if a newer loop was closed while we awaited
    if (thisRequest !== requestIdRef.current) return;

    saveShape(shapeResult.hash, shapeResult.raster);

    // Show result
    setResult({
      isNew: discovery.isNew,
      raster: shapeResult.raster,
      hash: shapeResult.hash,
    });

    // Clear after delay
    timerRef.current = setTimeout(() => {
      clearCanvas();
      setResult(null);
    }, RESULT_DISPLAY_MS);
  }, [clearCanvas]);

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
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      touchAction: 'none',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="img"
        aria-label="drawing canvas — draw a closed shape to discover it"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
      />

      {result && (
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>evaluated as →</span>
            <FittedShape raster={result.raster} size={48} />
          </div>
          <p style={{ fontSize: '0.875rem' }}>
            {result.isNew ? 'shape discovered.' : 'this shape has been drawn before.'}
          </p>
        </div>
      )}
    </div>
  );
}
