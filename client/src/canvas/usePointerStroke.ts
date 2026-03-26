import { useRef, useCallback } from 'react';
import type { Point } from 'shape-research-shared';
import { findAnySelfIntersection, trimToLargestLoop } from './intersection';

/** Minimum bounding box diagonal (px) for a loop to be accepted. */
const MIN_LOOP_SIZE = 50;

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

    function isLargeEnough(loop: Point[]): boolean {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of loop) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return Math.hypot(maxX - minX, maxY - minY) >= MIN_LOOP_SIZE;
    }

    // 1. Self-intersection: trim to the largest clean loop.
    if (points.length >= 4) {
      const intersection = findAnySelfIntersection(points);
      if (intersection) {
        const loop = trimToLargestLoop(points, intersection);
        if (isLargeEnough(loop)) {
          onLoopClosed(loop);
          pointsRef.current = [];
          return;
        }
      }
    }

    // 2. Snap-close: if end is near start and no open-stroke intersection was found.
    //    After closing, still check for self-intersection in the closed loop —
    //    this catches hourglasses where end ≈ start but the stroke crossed itself.
    if (points.length >= 4) {
      const start = points[0];
      const end = points[points.length - 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (dx * dx + dy * dy < snapDistance * snapDistance) {
        let loop = [...points, start];

        // Check the closed loop for self-intersections and trim if found
        const loopIx = findAnySelfIntersection(loop);
        if (loopIx) {
          loop = trimToLargestLoop(loop, loopIx);
        }

        if (isLargeEnough(loop)) {
          onLoopClosed(loop);
          pointsRef.current = [];
          return;
        }
      }
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
