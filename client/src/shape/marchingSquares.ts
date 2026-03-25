import { GRID_SIZE, type Point } from 'shape-research-shared';

/**
 * Generate an SVG path string from an 8×8 binary raster by tracing the
 * boundary edges between filled and empty cells.
 *
 * Each filled cell occupies [col, col+1] × [row, row+1] in output space.
 * An edge is a boundary if it separates a filled cell from an empty cell
 * (or the grid border). The directed edges are chained into closed contours.
 *
 * Output coordinates range from 0 to GRID_SIZE (8).
 */
export function rasterToSvgPath(raster: number[]): string {
  const segments = collectBoundaryEdges(raster);

  if (segments.length === 0) return '';

  const contours = chainSegments(segments);

  let path = '';
  for (const contour of contours) {
    if (contour.length < 2) continue;
    path += `M ${contour[0].x} ${contour[0].y} `;
    for (let i = 1; i < contour.length; i++) {
      path += `L ${contour[i].x} ${contour[i].y} `;
    }
    path += 'Z ';
  }

  return path;
}

/**
 * Generate a smoothed SVG path from an 8×8 binary raster.
 * Uses Douglas-Peucker to collapse the pixel staircase into key shape
 * vertices, then draws Catmull-Rom cubic bezier curves through them
 * for one continuous smooth outline.
 */
export function rasterToSmoothedPath(raster: number[]): string {
  const segments = collectBoundaryEdges(raster);

  if (segments.length === 0) return '';

  const contours = chainSegments(segments);

  let path = '';
  for (const contour of contours) {
    if (contour.length < 3) continue;

    // Remove the duplicate closing point if present
    const pts = pointsEqual(contour[0], contour[contour.length - 1])
      ? contour.slice(0, -1)
      : contour;

    if (pts.length < 3) continue;

    // Simplify: collapse staircase steps into clean diagonals
    const simplified = douglasPeuckerClosed(pts, 0.71);

    if (simplified.length < 3) continue;

    // Resample at uniform spacing to prevent Catmull-Rom pinching
    const resampled = resampleClosed(simplified, Math.max(simplified.length, 12));

    // Draw smooth Catmull-Rom curves through the evenly-spaced vertices
    path += catmullRomClosedPath(resampled);
  }

  return path;
}

/**
 * Douglas-Peucker simplification for a closed polygon.
 * Removes points that deviate less than `tolerance` from the line
 * between their neighbors, collapsing staircase patterns into
 * clean straight or diagonal edges.
 */
function douglasPeuckerClosed(points: Point[], tolerance: number): Point[] {
  const n = points.length;
  if (n <= 3) return points;

  // Find the two points farthest apart to split the closed polygon
  // into two open polylines, then simplify each half.
  let maxDist = 0;
  let splitA = 0;
  let splitB = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const d = dx * dx + dy * dy;
      if (d > maxDist) {
        maxDist = d;
        splitA = i;
        splitB = j;
      }
    }
  }

  // Build two halves
  const half1: Point[] = [];
  for (let i = splitA; i <= splitB; i++) half1.push(points[i]);
  const half2: Point[] = [];
  for (let i = splitB; i < n; i++) half2.push(points[i]);
  half2.push(points[splitA]);

  const s1 = douglasPeuckerOpen(half1, tolerance);
  const s2 = douglasPeuckerOpen(half2, tolerance);

  // Merge, avoiding duplicate junction points
  const result = [...s1];
  for (let i = 1; i < s2.length - 1; i++) result.push(s2[i]);

  return result;
}

/** Douglas-Peucker for an open polyline. */
function douglasPeuckerOpen(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  // Find the point farthest from the line between first and last
  const first = points[0];
  const last = points[points.length - 1];
  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = douglasPeuckerOpen(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeuckerOpen(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/** Perpendicular distance from point p to line segment a-b. */
function perpendicularDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return num / Math.sqrt(lenSq);
}

/**
 * Resample a closed polygon to n evenly spaced points.
 * Prevents Catmull-Rom pinching from uneven vertex spacing.
 */
function resampleClosed(points: Point[], n: number): Point[] {
  const len = points.length;
  // Compute cumulative arc lengths around the closed polygon
  const cumLen: number[] = [0];
  for (let i = 1; i <= len; i++) {
    const a = points[(i - 1) % len];
    const b = points[i % len];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = cumLen[len];
  if (totalLen === 0) return points;

  const step = totalLen / n;
  const result: Point[] = [];
  let segIdx = 1;

  for (let i = 0; i < n; i++) {
    const targetLen = i * step;
    while (segIdx < cumLen.length - 1 && cumLen[segIdx] < targetLen) segIdx++;
    const segStart = cumLen[segIdx - 1];
    const segEnd = cumLen[segIdx];
    const segSpan = segEnd - segStart;
    const t = segSpan > 0 ? (targetLen - segStart) / segSpan : 0;
    const a = points[(segIdx - 1) % len];
    const b = points[segIdx % len];
    result.push({
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y),
    });
  }

  return result;
}

/**
 * Convert a closed polygon to an SVG path using Catmull-Rom cubic
 * bezier curves. Produces one smooth continuous curve.
 * Uses a reduced tangent scale (1/8 instead of 1/6) to prevent overshoot.
 */
function catmullRomClosedPath(pts: Point[]): string {
  const n = pts.length;
  if (n < 3) return '';

  let path = `M ${r(pts[0].x)} ${r(pts[0].y)} `;

  // Tangent scale: 1/6 = standard Catmull-Rom, smaller = tighter curves
  const tangentScale = 1 / 8;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    // Catmull-Rom to cubic bezier control points
    const cp1x = p1.x + (p2.x - p0.x) * tangentScale;
    const cp1y = p1.y + (p2.y - p0.y) * tangentScale;
    const cp2x = p2.x - (p3.x - p1.x) * tangentScale;
    const cp2y = p2.y - (p3.y - p1.y) * tangentScale;

    path += `C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(p2.x)} ${r(p2.y)} `;
  }

  path += 'Z ';
  return path;
}

/** Round to 2 decimal places for compact SVG output. */
function r(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Collect directed boundary edges from the raster.
 * Edges are oriented so that the filled cell is to the right of the edge
 * direction (clockwise winding).
 */
function collectBoundaryEdges(raster: number[]): [Point, Point][] {
  const segments: [Point, Point][] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!raster[row * GRID_SIZE + col]) continue;

      // Top edge: if cell above is empty or OOB
      if (row === 0 || !raster[(row - 1) * GRID_SIZE + col]) {
        segments.push([{ x: col, y: row }, { x: col + 1, y: row }]);
      }
      // Right edge: if cell to the right is empty or OOB
      if (col === GRID_SIZE - 1 || !raster[row * GRID_SIZE + col + 1]) {
        segments.push([{ x: col + 1, y: row }, { x: col + 1, y: row + 1 }]);
      }
      // Bottom edge: if cell below is empty or OOB
      if (row === GRID_SIZE - 1 || !raster[(row + 1) * GRID_SIZE + col]) {
        segments.push([{ x: col + 1, y: row + 1 }, { x: col, y: row + 1 }]);
      }
      // Left edge: if cell to the left is empty or OOB
      if (col === 0 || !raster[row * GRID_SIZE + col - 1]) {
        segments.push([{ x: col, y: row + 1 }, { x: col, y: row }]);
      }
    }
  }

  return segments;
}

/** Map key for a point with integer coordinates. */
function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/**
 * Chain directed line segments into closed contours.
 * Uses a map from start-point to segment for O(n) chaining.
 */
function chainSegments(segments: [Point, Point][]): Point[][] {
  // Build a map: pointKey(start) → list of segment indices
  const startMap = new Map<string, number[]>();
  for (let i = 0; i < segments.length; i++) {
    const key = pointKey(segments[i][0]);
    let list = startMap.get(key);
    if (!list) { list = []; startMap.set(key, list); }
    list.push(i);
  }

  const used = new Uint8Array(segments.length);
  const contours: Point[][] = [];

  for (let start = 0; start < segments.length; start++) {
    if (used[start]) continue;
    used[start] = 1;

    const contour: Point[] = [segments[start][0]];
    let current = segments[start][1];
    contour.push(current);

    // Follow the chain: find a segment whose start matches current endpoint
    let extended = true;
    while (extended) {
      extended = false;
      const key = pointKey(current);
      const candidates = startMap.get(key);
      if (!candidates) continue;

      for (let n = 0; n < candidates.length; n++) {
        const idx = candidates[n];
        if (used[idx]) continue;
        used[idx] = 1;
        current = segments[idx][1];
        contour.push(current);
        extended = true;
        break;
      }
    }

    contours.push(contour);
  }

  return contours;
}
