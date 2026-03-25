import { useRef, useCallback } from 'react';
import type { Point } from 'shape-research-shared';
import { findAnySelfIntersection, trimToLoop } from './intersection';

interface UsePointerStrokeOptions {
  onStrokeUpdate: (points: Point[]) => void;
  onLoopClosed: (loop: Point[]) => void;
  onStrokeEnd: (points: Point[]) => void;
  minDistance?: number;
}

export function usePointerStroke({
  onStrokeUpdate,
  onLoopClosed,
  onStrokeEnd,
  minDistance = 3,
}: UsePointerStrokeOptions) {
  const pointsRef = useRef<Point[]>([]);
  const activeRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    pointsRef.current = [{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }];
    activeRef.current = true;
    onStrokeUpdate(pointsRef.current);
  }, [onStrokeUpdate]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;

    const points = pointsRef.current;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // Skip if too close to last point
    const last = points[points.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    if (dx * dx + dy * dy < minDistance * minDistance) return;

    points.push({ x, y });
    onStrokeUpdate([...points]);
  }, [onStrokeUpdate, minDistance]);

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    activeRef.current = false;

    const intersection = findAnySelfIntersection(pointsRef.current);
    if (intersection) {
      const loop = trimToLoop(pointsRef.current, intersection, intersection.secondSegmentIndex);
      onLoopClosed(loop);
    } else {
      onStrokeEnd([...pointsRef.current]);
    }

    pointsRef.current = [];
  }, [onStrokeEnd, onLoopClosed]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
