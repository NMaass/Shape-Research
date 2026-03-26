import { useRef, useCallback } from 'react';
import type { Point } from 'shape-research-shared';
import { findAnySelfIntersection, trimToLargestLoop } from './intersection';

/** Minimum bounding box diagonal (px) for a loop to be accepted. */
const MIN_LOOP_SIZE = 50;

/** When closing, trim tail to the point closest to start if it's within this distance. */
const CLOSE_PROXIMITY = 15;

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

/**
 * Trim the stroke tail: find the point after the halfway mark that is
 * closest to the start, and cut everything after it. This removes
 * overshoot, jagged closes, and fish-tails cleanly.
 */
function trimTail(points: Point[]): Point[] {
  if (points.length < 6) return points;
  const start = points[0];
  const half = Math.floor(points.length / 2);

  let bestIdx = points.length - 1;
  let bestDist = Infinity;
  for (let i = half; i < points.length; i++) {
    const d = Math.hypot(points[i].x - start.x, points[i].y - start.y);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }

  // Only trim if the closest point is reasonably close to start
  if (bestDist > CLOSE_PROXIMITY * 2) return points;
  return points.slice(0, bestIdx + 1);
}

/**
 * Detect if any non-adjacent parts of the stroke get very close (pinch point).
 * Returns the indices of the two close points, or null.
 * This catches hourglasses where segments don't technically cross but nearly touch.
 */
function findPinchPoint(points: Point[], proximity: number): { i: number; j: number } | null {
  const minGap = Math.max(10, Math.floor(points.length * 0.15));
  const proxSq = proximity * proximity;

  // Check every pair with sufficient separation along the stroke
  for (let i = 0; i < points.length - minGap; i++) {
    for (let j = i + minGap; j < points.length; j++) {
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      if (dx * dx + dy * dy < proxSq) {
        return { i, j };
      }
    }
  }
  return null;
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

    function tryClose(loop: Point[]): boolean {
      if (bboxDiag(loop) < MIN_LOOP_SIZE) return false;
      onLoopClosed(loop);
      pointsRef.current = [];
      return true;
    }

    if (points.length < 4) {
      onStrokeEnd([...points]);
      pointsRef.current = [];
      return;
    }

    // 1. Self-intersection: trim to the largest clean loop.
    const intersection = findAnySelfIntersection(points);
    if (intersection) {
      const loop = trimToLargestLoop(points, intersection);
      if (tryClose(loop)) return;
    }

    // 2. Trim tail back to closest approach to start, then close.
    //    This handles overshoot, jagged closes, and fish-tails.
    const trimmed = trimTail(points);

    // 3. Check trimmed stroke for self-intersection (hourglass after trimming)
    if (trimmed.length >= 4) {
      const closedTrimmed = [...trimmed, trimmed[0]];
      const trimIx = findAnySelfIntersection(closedTrimmed);
      if (trimIx) {
        const loop = trimToLargestLoop(closedTrimmed, trimIx);
        if (tryClose(loop)) return;
      }
    }

    // 4. Pinch detection: find where non-adjacent parts nearly touch (hourglass).
    //    Split at the pinch and take the larger sub-loop.
    const pinch = findPinchPoint(trimmed, CLOSE_PROXIMITY);
    if (pinch) {
      const loopA = [...trimmed.slice(pinch.i, pinch.j + 1), trimmed[pinch.i]];
      const loopB = [...trimmed.slice(pinch.j), ...trimmed.slice(0, pinch.i + 1)];
      const best = bboxDiag(loopA) >= bboxDiag(loopB) ? loopA : loopB;
      if (tryClose(best)) return;
    }

    // 5. Snap-close: if end of (trimmed) stroke is near start.
    const start = trimmed[0];
    const end = trimmed[trimmed.length - 1];
    if (Math.hypot(end.x - start.x, end.y - start.y) < snapDistance) {
      const loop = [...trimmed, start];
      if (tryClose(loop)) return;
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
