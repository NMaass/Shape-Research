import { describe, it, expect } from 'vitest';
import { processShape } from './pipeline';
import type { Point } from 'shape-research-shared';

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
function circleLoop(cx: number, cy: number, r: number, n = 64): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

/** Generate a rectangle (non-square). */
function rectLoop(cx: number, cy: number, w: number, h: number): Point[] {
  return [
    { x: cx - w, y: cy - h },
    { x: cx + w, y: cy - h },
    { x: cx + w, y: cy + h },
    { x: cx - w, y: cy + h },
    { x: cx - w, y: cy - h },
  ];
}

describe('processShape (geometric fitting pipeline)', () => {
  it('returns a hash string', () => {
    const result = processShape(squareLoop(200, 200, 100));
    expect(typeof result.hash).toBe('string');
    expect(result.hash.length).toBeGreaterThan(0);
  });

  it('returns a descriptor with correct shape', () => {
    const result = processShape(squareLoop(200, 200, 100));
    expect(result.descriptor.n).toBe(4);
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  it('square has 4 right angles', () => {
    const result = processShape(squareLoop(200, 200, 100));
    expect(result.descriptor.n).toBe(4);
    for (const angle of result.descriptor.angles) {
      // Quantized to 15° steps, should be 90°
      expect(angle).toBe(90);
    }
  });

  it('square has equal edge ratios', () => {
    const result = processShape(squareLoop(200, 200, 100));
    for (const ratio of result.descriptor.edgeRatios) {
      expect(ratio).toBe(1.0);
    }
  });

  it('triangle has 3 sides', () => {
    const result = processShape(triangleLoop(200, 200, 100));
    expect(result.descriptor.n).toBe(3);
  });

  it('circle detected as n=0', () => {
    const result = processShape(circleLoop(200, 200, 100));
    expect(result.descriptor.n).toBe(0);
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
    const circ = processShape(circleLoop(200, 200, 100));
    expect(sq.hash).not.toBe(tri.hash);
    expect(sq.hash).not.toBe(circ.hash);
    expect(tri.hash).not.toBe(circ.hash);
  });

  it('rotated square produces the same hash', () => {
    const a = processShape(squareLoop(200, 200, 100));
    const rotated = squareLoop(200, 200, 100).map(p => ({
      x: -(p.y - 200) + 200,
      y: (p.x - 200) + 200,
    }));
    const b = processShape(rotated);
    expect(a.hash).toBe(b.hash);
  });

  it('mirrored triangle produces the same hash', () => {
    const a = processShape(triangleLoop(200, 200, 100));
    const mirrored = triangleLoop(200, 200, 100).map(p => ({
      x: 400 - p.x,
      y: p.y,
    }));
    const b = processShape(mirrored);
    expect(a.hash).toBe(b.hash);
  });

  it('rectangle differs from square', () => {
    const sq = processShape(squareLoop(200, 200, 100));
    const rect = processShape(rectLoop(200, 200, 150, 80));
    expect(sq.hash).not.toBe(rect.hash);
  });

  it('freehand square with jitter still detects as 4-sided', () => {
    // Use a seeded PRNG for determinism
    let seed = 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    const base = squareLoop(200, 200, 100);
    const freehand: Point[] = [];
    for (let i = 0; i < base.length - 1; i++) {
      for (let t = 0; t < 20; t++) {
        const frac = t / 20;
        freehand.push({
          x: base[i].x + (base[i + 1].x - base[i].x) * frac + (rand() - 0.5) * 6,
          y: base[i].y + (base[i + 1].y - base[i].y) * frac + (rand() - 0.5) * 6,
        });
      }
    }
    freehand.push({ ...base[0] }); // close
    const result = processShape(freehand);
    expect(result.descriptor.n).toBe(4);
  });
});
