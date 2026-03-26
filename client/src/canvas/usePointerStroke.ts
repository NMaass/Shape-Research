import { useRef, useCallback } from 'react';
import type { Point } from 'shape-research-shared';
import { findFirstSelfIntersection, trimToLoop, type IntersectionResult } from './intersection';

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

function bboxDiag(pts: Point[]): number {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return Math.hypot(maxX - minX, maxY - minY);
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

  /** The first self-intersection detected during drawing, if any. */
  const firstIntersectionRef = useRef<{
    intersection: IntersectionResult;
    /** The number of points at the time of detection — everything after is tail. */
    pointCount: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    pointsRef.current = [{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, t: e.timeStamp }];
    activeRef.current = true;
    firstIntersectionRef.current = null;
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

    // Secretly record the first self-intersection. Don't stop drawing —
    // just remember it so we can use it on pen up.
    if (!firstIntersectionRef.current && points.length >= 4) {
      const ix = findFirstSelfIntersection(points);
      if (ix) {
        firstIntersectionRef.current = {
          intersection: ix,
          pointCount: points.length,
        };
      }
    }

    onStrokeUpdate([...points]);
  }, [onStrokeUpdate, minDistance]);

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    activeRef.current = false;

    const points = pointsRef.current;

    function tryClose(loop: Point[]): boolean {
      if (bboxDiag(loop) < MIN_LOOP_SIZE) return false;
      onLoopClosed(loop);
      pointsRef.current = [];
      firstIntersectionRef.current = null;
      return true;
    }

    if (points.length < 4) {
      onStrokeEnd([...points]);
      pointsRef.current = [];
      firstIntersectionRef.current = null;
      return;
    }

    // 1. If we secretly recorded a first intersection during drawing,
    //    use it. Trim the stroke to only the points up to that moment,
    //    then extract the loop. Everything after the intersection is tail.
    const saved = firstIntersectionRef.current;
    if (saved) {
      const trimmedPoints = points.slice(0, saved.pointCount);
      const loop = trimToLoop(trimmedPoints, saved.intersection);
      if (tryClose(loop)) return;
    }

    // 2. Snap-close: if end is near start, close the loop.
    const start = points[0];
    const end = points[points.length - 1];
    if (Math.hypot(end.x - start.x, end.y - start.y) < snapDistance) {
      const loop = [...points, start];
      if (tryClose(loop)) return;
    }

    onStrokeEnd([...points]);
    pointsRef.current = [];
    firstIntersectionRef.current = null;
  }, [onStrokeEnd, onLoopClosed, snapDistance]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
