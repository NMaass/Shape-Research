import type { Point } from 'shape-research-shared';

/**
 * Translate centroid to origin and scale uniformly to fit in a unit bounding box
 * (aspect-ratio preserving).
 */
export function normalize(points: Point[]): Point[] {
  if (points.length === 0) return [];

  // Compute centroid
  let cx = 0, cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;

  // Translate to origin
  const centered = points.map(p => ({
    x: p.x - cx,
    y: p.y - cy,
  }));

  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of centered) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height);

  if (scale === 0) return centered;

  // Scale to unit bounding box (uniform)
  return centered.map(p => ({
    x: (p.x - (minX + maxX) / 2) / scale + 0.5,
    y: (p.y - (minY + maxY) / 2) / scale + 0.5,
  }));
}
