import type { Point } from 'shape-research-shared';
import { GRID_SIZE } from 'shape-research-shared';
import { EPSILON } from '../math';

/**
 * Test if a point is inside a polygon using ray casting.
 */
function pointInPolygon(px: number, py: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if (
      ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if a line segment intersects a grid cell (axis-aligned box).
 */
function segmentIntersectsCell(
  ax: number, ay: number, bx: number, by: number,
  cellX: number, cellY: number, cellSize: number,
): boolean {
  const x1 = cellX, y1 = cellY;
  const x2 = cellX + cellSize, y2 = cellY + cellSize;

  if (ax >= x1 && ax <= x2 && ay >= y1 && ay <= y2) return true;
  if (bx >= x1 && bx <= x2 && by >= y1 && by <= y2) return true;

  const edges: [number, number, number, number][] = [
    [x1, y1, x2, y1],
    [x2, y1, x2, y2],
    [x1, y2, x2, y2],
    [x1, y1, x1, y2],
  ];

  for (const [cx, cy, dx, dy] of edges) {
    const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(denom) < EPSILON) continue;

    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }

  return false;
}

/**
 * Rasterize normalized points (in [0,1] space) onto an 8×8 binary grid.
 * A cell is 1 if the polygon boundary passes through it OR the cell center
 * is inside the polygon.
 */
export function rasterize(points: Point[]): number[] {
  const grid = new Array(GRID_SIZE * GRID_SIZE).fill(0);
  const cellSize = 1.0 / GRID_SIZE;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellX = col * cellSize;
      const cellY = row * cellSize;
      const centerX = cellX + cellSize / 2;
      const centerY = cellY + cellSize / 2;

      if (pointInPolygon(centerX, centerY, points)) {
        grid[row * GRID_SIZE + col] = 1;
        continue;
      }

      for (let i = 0; i < points.length - 1; i++) {
        if (segmentIntersectsCell(
          points[i].x, points[i].y,
          points[i + 1].x, points[i + 1].y,
          cellX, cellY, cellSize,
        )) {
          grid[row * GRID_SIZE + col] = 1;
          break;
        }
      }
    }
  }

  return grid;
}
