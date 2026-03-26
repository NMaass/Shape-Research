import { useRef, useCallback } from 'react';
import type { Point } from 'shape-research-shared';
import { findAnySelfIntersection, trimToLoop } from './intersection';

interface UsePointerStrokeOptions {
  onStrokeUpdate: (points: Point[]) => void;
  onLoopClosed: (loop: Point[]) => void;
  onStrokeEnd: (points: Point[]) => void;
  minDistance?: number;
  /** Max pixel distance between start and end to auto-close the loop */
  snapDistance?: number;
}

export function usePointerStroke({
  onStrokeUpdate,
  onLoopClosed,
  onStrokeEnd,
  minDistance = 3,
  snapDistance = 30,
}: UsePointerStrokeOptions) {
  const pointsRef = useRef<Point[]>([]);
  const activeRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    pointsRef.current = [{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, t: e.timeStamp }];
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

    points.push({ x, y, t: e.timeStamp });
    onStrokeUpdate([...points]);
  }, [onStrokeUpdate, minDistance]);

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    activeRef.current = false;

    const points = pointsRef.current;

    // Prefer snap-close: if the end is near the start, use the entire stroke
    // as the loop. This preserves complex shapes (stars, etc.) that would
    // otherwise be truncated to a small triangle at the first crossing.
    if (points.length >= 4) {
      const start = points[0];
      const end = points[points.length - 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (dx * dx + dy * dy < snapDistance * snapDistance) {
        const loop = [...points, start];
        onLoopClosed(loop);
        pointsRef.current = [];
        return;
      }
    }

    // Fall back to self-intersection detection
    const intersection = findAnySelfIntersection(points);
    if (intersection) {
      const loop = trimToLoop(points, intersection, intersection.secondSegmentIndex);
      onLoopClosed(loop);
      pointsRef.current = [];
      return;
    }

    onStrokeEnd([...points]);
    pointsRef.current = [];
  }, [onStrokeEnd, onLoopClosed, snapDistance]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
