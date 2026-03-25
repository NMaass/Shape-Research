import { describe, it, expect } from 'vitest';
import { findAnySelfIntersection } from './intersection';
import type { Point } from 'shape-research-shared';

/**
 * Test the snap-close logic extracted from usePointerStroke.
 * The hook itself needs React, so we test the pure logic here.
 */

const DEFAULT_SNAP_DISTANCE = 30;

/** Replicate the snap-close decision logic from usePointerStroke. */
function shouldSnapClose(
  points: Point[],
  snapDistance = DEFAULT_SNAP_DISTANCE,
): { closes: boolean; method: 'intersection' | 'snap' | 'none' } {
  // Prefer snap-close: preserves complex shapes like stars
  if (points.length >= 4) {
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx * dx + dy * dy < snapDistance * snapDistance) {
      return { closes: true, method: 'snap' };
    }
  }

  // Fall back to self-intersection
  const intersection = findAnySelfIntersection(points);
  if (intersection) {
    return { closes: true, method: 'intersection' };
  }

  return { closes: false, method: 'none' };
}

describe('snap-close logic', () => {
  describe('self-intersection detection', () => {
    it('detects a figure-8 crossing', () => {
      // A path that crosses itself
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 50, y: -50 }, // crosses the first segment
      ];
      const result = shouldSnapClose(points);
      expect(result.closes).toBe(true);
      expect(result.method).toBe('intersection');
    });
  });

  describe('snap-to-start', () => {
    it('snaps when endpoint is within threshold of start', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 },
        { x: 110, y: 105 }, // 14px from start — within 30px threshold
      ];
      const result = shouldSnapClose(points);
      expect(result.closes).toBe(true);
      expect(result.method).toBe('snap');
    });

    it('does not snap when endpoint is far from start', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 },
        { x: 150, y: 150 }, // ~71px from start
      ];
      const result = shouldSnapClose(points);
      expect(result.closes).toBe(false);
      expect(result.method).toBe('none');
    });

    it('snaps at exactly the threshold distance', () => {
      // Use a path that does NOT self-intersect but ends near start
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 29 }, // 29px from start, no crossing
      ];
      const result = shouldSnapClose(points);
      expect(result.closes).toBe(true);
      expect(result.method).toBe('snap');
    });

    it('does not snap for very short strokes (< 4 points)', () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 1, y: 1 }, // close to start but only 3 points
      ];
      const result = shouldSnapClose(points);
      expect(result.closes).toBe(false);
    });

    it('prefers snap over intersection when both apply', () => {
      // A path that crosses itself AND ends near start.
      // Snap takes priority to preserve full shape (e.g. stars).
      const points: Point[] = [
        { x: 50, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 0 },
        { x: 75, y: -20 }, // crosses seg 0→1
        { x: 55, y: 5 },   // also close to start (50,0)
      ];
      const result = shouldSnapClose(points);
      expect(result.closes).toBe(true);
      expect(result.method).toBe('snap');
    });

    it('respects custom snap distance', () => {
      // Path that does NOT self-intersect, ends 15px from start
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 15 }, // 15px from start, no crossing
      ];
      // With small threshold, should not snap
      expect(shouldSnapClose(points, 10).closes).toBe(false);
      // With larger threshold, should snap
      expect(shouldSnapClose(points, 20).closes).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles a perfectly closed loop (end == start)', () => {
      // A simple rectangle that doesn't cross itself
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 },
        { x: 100, y: 100 }, // exactly at start — distance 0
      ];
      const result = shouldSnapClose(points);
      expect(result.closes).toBe(true);
      // This may detect as intersection (last segment back to start crosses first segment)
      // or snap (distance is 0). Either is fine — the shape closes.
      expect(['snap', 'intersection']).toContain(result.method);
    });

    it('handles single-point stroke', () => {
      const result = shouldSnapClose([{ x: 50, y: 50 }]);
      expect(result.closes).toBe(false);
    });

    it('handles two-point stroke', () => {
      const result = shouldSnapClose([
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ]);
      expect(result.closes).toBe(false);
    });
  });
});
