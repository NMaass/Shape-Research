import type { Point, ShapeResult } from 'shape-research-shared';
import simplify from 'simplify-js';
import { resample } from './resample';
import { fitShape, canonicalizeDescriptor, hashDescriptor, reconstructShape } from './fitShape';

const RESAMPLE_COUNT = 128;

/**
 * Estimate a good simplification tolerance from the shape's bounding box.
 * Uses ~1% of the shape's diagonal — just enough to shave off tiny spikes
 * from messy closes without rounding real corners.
 */
function autoTolerance(pts: Point[]): number {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY);
  return Math.max(0.5, diag * 0.01);
}

/**
 * Smooth a closed loop with a moving average to round off jaggedness.
 * Preserves timestamps if present.
 */
function smoothLoop(pts: Point[], windowSize: number): Point[] {
  const n = pts.length - 1; // closed: last = first
  if (n < windowSize * 2) return pts;

  const smoothed: Point[] = [];
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0, st = 0, hasT = false;
    let count = 0;
    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = ((i + j) % n + n) % n;
      sx += pts[idx].x;
      sy += pts[idx].y;
      if (pts[idx].t != null) { st += pts[idx].t!; hasT = true; }
      count++;
    }
    const p: Point = { x: sx / count, y: sy / count };
    if (hasT) p.t = st / count;
    smoothed.push(p);
  }
  smoothed.push({ ...smoothed[0] }); // re-close
  return smoothed;
}

/**
 * Full pipeline:
 * raw loop → simplify (remove tiny features) → smooth → resample
 *          → fit geometric shape (detect corners, angles, edges)
 *          → canonicalize (dihedral symmetry) → hash descriptor
 */
export function processShape(loopPoints: Point[]): ShapeResult {
  // 1. Remove tiny spikes/peninsulas (Douglas-Peucker via simplify-js).
  //    Only apply to dense strokes — sparse vertex-only shapes (like test
  //    data with 5-6 points) don't need it and would lose corners.
  // 1. Remove tiny spikes/peninsulas from dense freehand strokes.
  //    Only apply to dense freehand strokes — real canvas drawing typically
  //    produces 200+ points. Sparser input (clean polygons, test shapes)
  //    doesn't need smoothing and would be degraded by it.
  let cleaned = loopPoints;
  if (loopPoints.length > 150) {
    const tolerance = autoTolerance(loopPoints);
    cleaned = simplify(loopPoints, tolerance, true) as Point[];

    // Re-close if simplification dropped the closing point
    if (cleaned.length >= 3) {
      const first = cleaned[0], last = cleaned[cleaned.length - 1];
      if (Math.hypot(first.x - last.x, first.y - last.y) > 1) {
        cleaned.push({ ...first });
      }
    }

    // 2. Light smoothing (window=1) to round off remaining jaggedness
    cleaned = smoothLoop(cleaned, 1);
  }

  // 3. Resample to uniform spacing
  const resampled = resample(cleaned, RESAMPLE_COUNT);

  const { descriptor, drawnVertices } = fitShape(resampled);
  const canonical = canonicalizeDescriptor(descriptor);
  const hash = hashDescriptor(canonical);
  const vertices = reconstructShape(canonical);

  return { hash, descriptor: canonical, drawnVertices, vertices };
}
