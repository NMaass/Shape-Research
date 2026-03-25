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
 * Applies Chaikin corner-cutting to round the jagged pixel boundaries,
 * then emits cubic bezier curves for a soft, organic outline.
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

    // Apply Chaikin corner-cutting (3 iterations for nice smoothness)
    const smooth = chaikinSmooth(pts, 3);

    // Emit as cubic bezier through the smoothed points
    path += smoothedContourToPath(smooth);
  }

  return path;
}

/**
 * Chaikin's corner-cutting algorithm on a closed polygon.
 * Each iteration replaces each edge with two points at 25% and 75%,
 * producing a progressively smoother curve.
 */
function chaikinSmooth(points: Point[], iterations: number): Point[] {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      next.push({
        x: a.x * 0.75 + b.x * 0.25,
        y: a.y * 0.75 + b.y * 0.25,
      });
      next.push({
        x: a.x * 0.25 + b.x * 0.75,
        y: a.y * 0.25 + b.y * 0.75,
      });
    }
    pts = next;
  }
  return pts;
}

/**
 * Convert a smoothed closed contour to an SVG path using Catmull-Rom
 * style cubic bezier segments for extra smoothness.
 */
function smoothedContourToPath(pts: Point[]): string {
  if (pts.length < 3) return '';

  const n = pts.length;
  let path = `M ${r(pts[0].x)} ${r(pts[0].y)} `;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    // Catmull-Rom to cubic bezier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

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
