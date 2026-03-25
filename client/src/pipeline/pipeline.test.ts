import { describe, it, expect } from 'vitest';
import { processShape } from './pipeline';
import { rasterize } from './rasterize';
import { normalize } from './normalize';
import { resample } from './resample';
import type { Point } from 'shape-research-shared';
import { GRID_SIZE } from 'shape-research-shared';

/** Generate a square loop of points centered at (cx, cy) with half-size s. */
function squareLoop(cx: number, cy: number, s: number): Point[] {
  return [
    { x: cx - s, y: cy - s },
    { x: cx + s, y: cy - s },
    { x: cx + s, y: cy + s },
    { x: cx - s, y: cy + s },
    { x: cx - s, y: cy - s }, // close
  ];
}

/** Generate a triangle loop. */
function triangleLoop(cx: number, cy: number, s: number): Point[] {
  return [
    { x: cx, y: cy - s },
    { x: cx + s, y: cy + s },
    { x: cx - s, y: cy + s },
    { x: cx, y: cy - s }, // close
  ];
}

/** Generate a circle-ish loop with N points. */
function circleLoop(cx: number, cy: number, r: number, n = 32): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

describe('resample', () => {
  it('resamples a square to the requested point count', () => {
    const loop = squareLoop(200, 200, 100);
    const resampled = resample(loop, 64);
    expect(resampled.length).toBe(64);
  });

  it('preserves start and end points', () => {
    const loop = squareLoop(200, 200, 100);
    const resampled = resample(loop, 64);
    expect(resampled[0].x).toBeCloseTo(loop[0].x, 5);
    expect(resampled[0].y).toBeCloseTo(loop[0].y, 5);
    expect(resampled[63].x).toBeCloseTo(loop[loop.length - 1].x, 5);
    expect(resampled[63].y).toBeCloseTo(loop[loop.length - 1].y, 5);
  });
});

describe('normalize', () => {
  it('maps points into [0, 1] range', () => {
    const loop = squareLoop(500, 300, 150);
    const norm = normalize(loop);
    for (const p of norm) {
      expect(p.x).toBeGreaterThanOrEqual(-0.01);
      expect(p.x).toBeLessThanOrEqual(1.01);
      expect(p.y).toBeGreaterThanOrEqual(-0.01);
      expect(p.y).toBeLessThanOrEqual(1.01);
    }
  });

  it('preserves aspect ratio (square stays square-ish)', () => {
    const loop = squareLoop(200, 200, 100);
    const norm = normalize(loop);
    const xs = norm.map(p => p.x);
    const ys = norm.map(p => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(Math.abs(width - height)).toBeLessThan(0.05);
  });
});

describe('rasterize', () => {
  it('produces a 64-element array', () => {
    const norm = normalize(squareLoop(200, 200, 100));
    const raster = rasterize(norm);
    expect(raster.length).toBe(GRID_SIZE * GRID_SIZE);
  });

  it('square loop fills interior cells', () => {
    const norm = normalize(squareLoop(200, 200, 100));
    const raster = rasterize(norm);
    const filledCount = raster.filter(v => v === 1).length;
    // A square should fill a significant portion
    expect(filledCount).toBeGreaterThan(20);
  });

  it('triangle loop has fewer filled cells than square', () => {
    const sqNorm = normalize(squareLoop(200, 200, 100));
    const triNorm = normalize(triangleLoop(200, 200, 100));
    const sqRaster = rasterize(sqNorm);
    const triRaster = rasterize(triNorm);
    const sqFilled = sqRaster.filter(v => v === 1).length;
    const triFilled = triRaster.filter(v => v === 1).length;
    expect(triFilled).toBeLessThan(sqFilled);
  });

  it('circle fills more cells than triangle', () => {
    const circNorm = normalize(circleLoop(200, 200, 100));
    const triNorm = normalize(triangleLoop(200, 200, 100));
    const circRaster = rasterize(circNorm);
    const triRaster = rasterize(triNorm);
    const circFilled = circRaster.filter(v => v === 1).length;
    const triFilled = triRaster.filter(v => v === 1).length;
    expect(circFilled).toBeGreaterThan(triFilled);
  });

  it('all raster values are 0 or 1', () => {
    const norm = normalize(squareLoop(200, 200, 100));
    const raster = rasterize(norm);
    for (const v of raster) {
      expect(v === 0 || v === 1).toBe(true);
    }
  });
});

describe('processShape (full pipeline)', () => {
  it('returns a hash string', () => {
    const result = processShape(squareLoop(200, 200, 100));
    expect(typeof result.hash).toBe('string');
    expect(result.hash.length).toBeGreaterThan(0);
  });

  it('returns both raster and drawnRaster', () => {
    const result = processShape(squareLoop(200, 200, 100));
    expect(result.raster.length).toBe(64);
    expect(result.drawnRaster.length).toBe(64);
  });

  it('same shape at different positions produces the same hash', () => {
    const a = processShape(squareLoop(100, 100, 80));
    const b = processShape(squareLoop(400, 300, 80));
    expect(a.hash).toBe(b.hash);
  });

  it('same shape at different scales produces the same hash', () => {
    const a = processShape(squareLoop(200, 200, 50));
    const b = processShape(squareLoop(200, 200, 200));
    expect(a.hash).toBe(b.hash);
  });

  it('different shapes produce different hashes', () => {
    const sq = processShape(squareLoop(200, 200, 100));
    const tri = processShape(triangleLoop(200, 200, 100));
    expect(sq.hash).not.toBe(tri.hash);
  });

  it('rotated square produces the same hash (dihedral canonicalization)', () => {
    // A square rotated 90° should still be the same canonical shape
    const a = processShape(squareLoop(200, 200, 100));
    // Rotate 90°: (x,y) → (-y, x)
    const rotated = squareLoop(200, 200, 100).map(p => ({
      x: -(p.y - 200) + 200,
      y: (p.x - 200) + 200,
    }));
    const b = processShape(rotated);
    expect(a.hash).toBe(b.hash);
  });
});
