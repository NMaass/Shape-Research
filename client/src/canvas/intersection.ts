import type { Point } from 'shape-research-shared';

export interface IntersectionResult {
  point: Point;
  /** Index of the earlier segment (the one being tested against) */
  segmentIndex: number;
  /** Parametric t along the earlier segment */
  t: number;
}

const EPSILON = 1e-10;

/**
 * Test if two line segments intersect.
 * Segment 1: a -> b, Segment 2: c -> d
 * Returns parametric values (t, u) and the intersection point, or null.
 */
function segmentIntersection(
  a: Point, b: Point, c: Point, d: Point,
): { t: number; u: number; point: Point } | null {
  const bax = b.x - a.x;
  const bay = b.y - a.y;
  const dcx = d.x - c.x;
  const dcy = d.y - c.y;

  const denom = bax * dcy - bay * dcx;
  if (Math.abs(denom) < EPSILON) return null; // Near-parallel

  const cax = c.x - a.x;
  const cay = c.y - a.y;

  const t = (cax * dcy - cay * dcx) / denom;
  const u = (cax * bay - cay * bax) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return {
    t,
    u,
    point: { x: a.x + t * bax, y: a.y + t * bay },
  };
}

/**
 * Given a stroke (array of points), check if the newest segment
 * (from points[n-2] to points[n-1]) intersects any earlier segment.
 * Skip the immediately adjacent segments (n-3 to n-2 shares a point).
 *
 * Returns the first intersection found (earliest segment), or null.
 */
export function findFirstSelfIntersection(
  points: Point[],
): IntersectionResult | null {
  const n = points.length;
  if (n < 4) return null;

  const c = points[n - 2];
  const d = points[n - 1];

  // Test newest segment (c→d) against all earlier segments except adjacent ones.
  // Skip segment (n-3, n-2) because it shares point c.
  for (let i = 0; i < n - 3; i++) {
    const a = points[i];
    const b = points[i + 1];

    const result = segmentIntersection(a, b, c, d);
    if (result) {
      return {
        point: result.point,
        segmentIndex: i,
        t: result.t,
      };
    }
  }

  return null;
}

export interface FullIntersectionResult extends IntersectionResult {
  /** Index of the later segment */
  secondSegmentIndex: number;
}

/**
 * Check ALL segment pairs in the stroke for any self-intersection.
 * Skips adjacent segments (which share an endpoint).
 * Returns the first intersection found, or null.
 */
export function findAnySelfIntersection(
  points: Point[],
): FullIntersectionResult | null {
  const n = points.length;
  if (n < 4) return null;

  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    // Skip adjacent segment (j = i+1 shares endpoint b)
    for (let j = i + 2; j < n - 1; j++) {
      const result = segmentIntersection(a, b, points[j], points[j + 1]);
      if (result) {
        return {
          point: result.point,
          segmentIndex: i,
          t: result.t,
          secondSegmentIndex: j,
        };
      }
    }
  }

  return null;
}

/**
 * Trim the stroke to the closed loop formed at the intersection.
 * The loop runs from the intersection point on the earlier segment,
 * through intermediate points, up to the later segment's start,
 * and closes back at the intersection point.
 *
 * When `endSegmentIndex` is provided (from findAnySelfIntersection),
 * the loop ends at that segment rather than the last segment.
 */
export function trimToLoop(
  points: Point[],
  intersection: IntersectionResult,
  endSegmentIndex?: number,
): Point[] {
  const { point, segmentIndex } = intersection;
  const end = endSegmentIndex ?? points.length - 2;

  const loop: Point[] = [point];

  for (let i = segmentIndex + 1; i <= end; i++) {
    loop.push(points[i]);
  }

  // The loop closes back at the intersection point
  loop.push(point);

  return loop;
}
