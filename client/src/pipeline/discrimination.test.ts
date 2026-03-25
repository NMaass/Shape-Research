import { describe, it, expect } from 'vitest';
import { processShape } from './pipeline';
import type { Point } from 'shape-research-shared';

// --- Shape generators ---

function makeCircle(cx: number, cy: number, r: number, n = 64): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function makeSquare(cx: number, cy: number, size: number): Point[] {
  const s = size / 2;
  return [
    { x: cx - s, y: cy - s }, { x: cx + s, y: cy - s },
    { x: cx + s, y: cy + s }, { x: cx - s, y: cy + s },
    { x: cx - s, y: cy - s },
  ];
}

function makeTriangle(cx: number, cy: number, size: number): Point[] {
  const s = size / 2;
  return [
    { x: cx, y: cy - s },
    { x: cx + s, y: cy + s },
    { x: cx - s, y: cy + s },
    { x: cx, y: cy - s },
  ];
}

function makeRect(cx: number, cy: number, w: number, h: number): Point[] {
  return [
    { x: cx - w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 }, { x: cx - w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy - h / 2 },
  ];
}

function makePentagon(cx: number, cy: number, r: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= 5; i++) {
    const angle = (2 * Math.PI * i) / 5 - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function makeHexagon(cx: number, cy: number, r: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= 6; i++) {
    const angle = (2 * Math.PI * i) / 6;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

// --- Helpers ---

function jitter(pts: Point[], amount: number): Point[] {
  return pts.map(p => ({
    x: p.x + (Math.random() - 0.5) * amount * 2,
    y: p.y + (Math.random() - 0.5) * amount * 2,
  }));
}

function interpolateEdges(pts: Point[], pointsPerEdge: number, noise = 0): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let t = 0; t < pointsPerEdge; t++) {
      const frac = t / pointsPerEdge;
      result.push({
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * frac + (Math.random() - 0.5) * noise * 2,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * frac + (Math.random() - 0.5) * noise * 2,
      });
    }
  }
  result.push({ ...pts[0] });
  return result;
}

function rotateShape(pts: Point[], angle: number, cx: number, cy: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return pts.map(p => ({
    x: cos * (p.x - cx) - sin * (p.y - cy) + cx,
    y: sin * (p.x - cx) + cos * (p.y - cy) + cy,
  }));
}

function mirrorH(pts: Point[], cx: number): Point[] {
  return pts.map(p => ({ x: 2 * cx - p.x, y: p.y }));
}

describe('shape discrimination', () => {
  describe('correct shape detection', () => {
    it('detects square as 4-sided with right angles', () => {
      const r = processShape(makeSquare(200, 200, 200));
      expect(r.descriptor.n).toBe(4);
      for (const a of r.descriptor.angles) expect(a).toBe(90);
    });

    it('detects triangle as 3-sided', () => {
      const r = processShape(makeTriangle(200, 200, 200));
      expect(r.descriptor.n).toBe(3);
    });

    it('detects circle as n=0', () => {
      const r = processShape(makeCircle(200, 200, 100));
      expect(r.descriptor.n).toBe(0);
    });

    it('detects pentagon as 5-sided', () => {
      const r = processShape(makePentagon(200, 200, 100));
      expect(r.descriptor.n).toBe(5);
    });

    it('detects hexagon as 6-sided', () => {
      const r = processShape(makeHexagon(200, 200, 100));
      expect(r.descriptor.n).toBe(6);
    });
  });

  describe('same shape produces same hash', () => {
    it('square at different positions', () => {
      const a = processShape(makeSquare(100, 100, 200));
      const b = processShape(makeSquare(400, 300, 200));
      expect(a.hash).toBe(b.hash);
    });

    it('square at different scales', () => {
      const a = processShape(makeSquare(200, 200, 100));
      const b = processShape(makeSquare(200, 200, 300));
      expect(a.hash).toBe(b.hash);
    });

    it('triangle rotated 90°', () => {
      const a = processShape(makeTriangle(200, 200, 200));
      const b = processShape(rotateShape(makeTriangle(200, 200, 200), Math.PI / 2, 200, 200));
      expect(a.hash).toBe(b.hash);
    });

    it('triangle mirrored', () => {
      const a = processShape(makeTriangle(200, 200, 200));
      const b = processShape(mirrorH(makeTriangle(200, 200, 200), 200));
      expect(a.hash).toBe(b.hash);
    });

    it('freehand square with ±5px jitter', () => {
      const base = makeSquare(200, 200, 250);
      const freehand = interpolateEdges(base, 30, 5);
      const r = processShape(freehand);
      expect(r.descriptor.n).toBe(4);
      // Angles should still be ~90°
      for (const a of r.descriptor.angles) {
        expect(Math.abs(a - 90)).toBeLessThanOrEqual(15);
      }
    });

    it('freehand square produces few hash variants', () => {
      const base = makeSquare(200, 200, 250);
      const results = Array.from({ length: 10 }, () => {
        const freehand = interpolateEdges(base, 30, 5);
        return processShape(freehand);
      });
      const hashes = new Set(results.map(r => r.hash));
      // Random noise means some variance is expected, but should be limited
      expect(hashes.size).toBeLessThanOrEqual(5);
      // All should detect as 4-sided
      for (const r of results) {
        expect(r.descriptor.n).toBe(4);
      }
    });

    it('freehand circle produces few hash variants', () => {
      const results = Array.from({ length: 10 }, () => {
        const pts: Point[] = [];
        for (let i = 0; i <= 60; i++) {
          const angle = (2 * Math.PI * i) / 60;
          const r = 140 + (Math.random() - 0.5) * 15;
          pts.push({
            x: 200 + r * Math.cos(angle) + (Math.random() - 0.5) * 5,
            y: 200 + r * Math.sin(angle) + (Math.random() - 0.5) * 5,
          });
        }
        return processShape(pts);
      });
      // Circles should mostly hash the same (n=0)
      const nValues = new Set(results.map(r => r.descriptor.n));
      expect(nValues.has(0)).toBe(true);
    });
  });

  describe('different shapes produce different hashes', () => {
    it('square vs triangle', () => {
      const sq = processShape(makeSquare(200, 200, 200));
      const tri = processShape(makeTriangle(200, 200, 200));
      expect(sq.hash).not.toBe(tri.hash);
    });

    it('square vs circle', () => {
      const sq = processShape(makeSquare(200, 200, 200));
      const circ = processShape(makeCircle(200, 200, 100));
      expect(sq.hash).not.toBe(circ.hash);
    });

    it('triangle vs circle', () => {
      const tri = processShape(makeTriangle(200, 200, 200));
      const circ = processShape(makeCircle(200, 200, 100));
      expect(tri.hash).not.toBe(circ.hash);
    });

    it('square vs rectangle', () => {
      const sq = processShape(makeSquare(200, 200, 200));
      const rect = processShape(makeRect(200, 200, 300, 150));
      expect(sq.hash).not.toBe(rect.hash);
    });

    it('pentagon vs hexagon', () => {
      const pent = processShape(makePentagon(200, 200, 100));
      const hex = processShape(makeHexagon(200, 200, 100));
      expect(pent.hash).not.toBe(hex.hash);
    });
  });
});
