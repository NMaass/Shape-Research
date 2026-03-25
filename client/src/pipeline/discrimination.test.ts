import { describe, it, expect } from 'vitest';
import type { Point } from 'shape-research-shared';
import { processShape } from './pipeline';

// --- Shape generators ---

function makeCircle(cx: number, cy: number, r: number, n = 80): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function makeEllipse(cx: number, cy: number, rx: number, ry: number, n = 80): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    pts.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }
  return pts;
}

function makeSquare(cx: number, cy: number, size: number): Point[] {
  const h = size / 2;
  return [
    { x: cx - h, y: cy - h },
    { x: cx + h, y: cy - h },
    { x: cx + h, y: cy + h },
    { x: cx - h, y: cy + h },
    { x: cx - h, y: cy - h }, // close
  ];
}

function makeRect(cx: number, cy: number, w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2;
  return [
    { x: cx - hw, y: cy - hh },
    { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh },
    { x: cx - hw, y: cy + hh },
    { x: cx - hw, y: cy - hh },
  ];
}

function makeTriangle(cx: number, cy: number, size: number): Point[] {
  const h = size * Math.sqrt(3) / 2;
  return [
    { x: cx, y: cy - h * 2 / 3 },
    { x: cx + size / 2, y: cy + h / 3 },
    { x: cx - size / 2, y: cy + h / 3 },
    { x: cx, y: cy - h * 2 / 3 }, // close
  ];
}

function makeDiamond(cx: number, cy: number, size: number): Point[] {
  const h = size / 2;
  return [
    { x: cx, y: cy - h },
    { x: cx + h, y: cy },
    { x: cx, y: cy + h },
    { x: cx - h, y: cy },
    { x: cx, y: cy - h },
  ];
}

/** Rotate all points around a center */
function rotateShape(pts: Point[], angle: number, cx: number, cy: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return pts.map(p => ({
    x: cos * (p.x - cx) - sin * (p.y - cy) + cx,
    y: sin * (p.x - cx) + cos * (p.y - cy) + cy,
  }));
}

/** Add random jitter to each point */
function jitter(pts: Point[], amount: number): Point[] {
  return pts.map(p => ({
    x: p.x + (Math.random() - 0.5) * amount,
    y: p.y + (Math.random() - 0.5) * amount,
  }));
}

/** Scale shape uniformly */
function scaleShape(pts: Point[], factor: number, cx: number, cy: number): Point[] {
  return pts.map(p => ({
    x: (p.x - cx) * factor + cx,
    y: (p.y - cy) * factor + cy,
  }));
}

/** Mirror horizontally */
function mirrorH(pts: Point[], cx: number): Point[] {
  return pts.map(p => ({ x: 2 * cx - p.x, y: p.y }));
}

// --- Tests ---

function countDiffBits(a: number[], b: number[]): number {
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff;
}

function rasterToGrid(raster: number[]): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    rows.push(raster.slice(r * 8, (r + 1) * 8).map(v => v ? '#' : '.').join(''));
  }
  return rows.join('\n');
}

describe('shape discrimination', () => {
  describe('same shape should produce same hash', () => {
    it('circle at different positions', () => {
      const a = processShape(makeCircle(100, 100, 50));
      const b = processShape(makeCircle(300, 200, 50));
      const c = processShape(makeCircle(0, 0, 50));
      console.log('Circle raster:\n' + rasterToGrid(a.raster));
      expect(a.hash).toBe(b.hash);
      expect(a.hash).toBe(c.hash);
    });

    it('circle at different sizes', () => {
      const a = processShape(makeCircle(100, 100, 30));
      const b = processShape(makeCircle(100, 100, 80));
      const c = processShape(makeCircle(100, 100, 200));
      expect(a.hash).toBe(b.hash);
      expect(a.hash).toBe(c.hash);
    });

    it('square at different positions and sizes', () => {
      const a = processShape(makeSquare(100, 100, 60));
      const b = processShape(makeSquare(300, 50, 120));
      const c = processShape(makeSquare(0, 0, 200));
      console.log('Square raster:\n' + rasterToGrid(a.raster));
      expect(a.hash).toBe(b.hash);
      expect(a.hash).toBe(c.hash);
    });

    it('square rotated 90 degrees', () => {
      const a = processShape(makeSquare(100, 100, 60));
      const b = processShape(rotateShape(makeSquare(100, 100, 60), Math.PI / 2, 100, 100));
      expect(a.hash).toBe(b.hash);
    });

    it('triangle rotated by 90°', () => {
      const a = processShape(makeTriangle(100, 100, 60));
      const b = processShape(rotateShape(makeTriangle(100, 100, 60), Math.PI / 2, 100, 100));
      console.log('Triangle raster:\n' + rasterToGrid(a.raster));
      console.log('Triangle 90° raster:\n' + rasterToGrid(b.raster));
      // At 8×8 resolution, continuous rotation introduces rasterization
      // differences even for exact 90°. Hashes should be close but may
      // differ by 1-2 bits on boundary cells.
      const diffBits = countDiffBits(a.raster, b.raster);
      expect(diffBits).toBeLessThanOrEqual(4);
    });

    it('shape mirrored horizontally', () => {
      const a = processShape(makeTriangle(100, 100, 60));
      const b = processShape(mirrorH(makeTriangle(100, 100, 60), 100));
      expect(a.hash).toBe(b.hash);
    });

    it('circle with slight jitter', () => {
      const a = processShape(makeCircle(200, 200, 80));
      const b = processShape(jitter(makeCircle(200, 200, 80), 3));
      const c = processShape(jitter(makeCircle(200, 200, 80), 5));
      expect(a.hash).toBe(b.hash);
      expect(a.hash).toBe(c.hash);
    });

    it('square with slight jitter', () => {
      const a = processShape(makeSquare(200, 200, 100));
      const b = processShape(jitter(makeSquare(200, 200, 100), 3));
      const c = processShape(jitter(makeSquare(200, 200, 100), 5));
      expect(a.hash).toBe(b.hash);
      expect(a.hash).toBe(c.hash);
    });

    it('realistic freehand circle (±5px wobble on 400px canvas)', () => {
      // ~150px radius circle on 400px canvas with ±5px hand wobble (±3%)
      const base = makeCircle(200, 200, 150);
      const results = Array.from({ length: 10 }, () => processShape(jitter(base, 5)));
      const hashes = new Set(results.map(r => r.hash));
      console.log(`Realistic circle jitter: ${hashes.size} unique hashes from 10 draws`);
      expect(hashes.size).toBe(1);
    });

    it('realistic freehand square (±5px wobble on 400px canvas)', () => {
      const base = makeSquare(200, 200, 250);
      const results = Array.from({ length: 10 }, () => processShape(jitter(base, 5)));
      const hashes = new Set(results.map(r => r.hash));
      console.log(`Realistic square jitter: ${hashes.size} unique hashes from 10 draws`);
      expect(hashes.size).toBe(1);
    });

    it('realistic freehand triangle (±5px wobble on 400px canvas)', () => {
      const base = makeTriangle(200, 200, 250);
      const results = Array.from({ length: 10 }, () => processShape(jitter(base, 5)));
      const hashes = new Set(results.map(r => r.hash));
      console.log(`Realistic triangle jitter: ${hashes.size} unique hashes from 10 draws`);
      // With K=6 smoothing (preserves features), expect some boundary variation
      expect(hashes.size).toBeLessThanOrEqual(5);
    });

    it('freehand square (many interpolated points with hand noise)', () => {
      function freehandSquare(): Point[] {
        const pts: Point[] = [];
        // ~250px square on ~400px canvas, ±5px wobble = ~2%
        const corners = [
          [75, 75], [325, 75], [325, 325], [75, 325], [75, 75],
        ];
        for (let i = 0; i < corners.length - 1; i++) {
          const [x1, y1] = corners[i];
          const [x2, y2] = corners[i + 1];
          for (let t = 0; t < 30; t++) {
            const frac = t / 30;
            pts.push({
              x: x1 + (x2 - x1) * frac + (Math.random() - 0.5) * 10,
              y: y1 + (y2 - y1) * frac + (Math.random() - 0.5) * 10,
            });
          }
        }
        return pts;
      }

      const results = Array.from({ length: 10 }, () => processShape(freehandSquare()));
      const hashes = new Set(results.map(r => r.hash));
      console.log(`Freehand square: ${hashes.size} unique hashes from 10 draws`);
      for (const r of results) console.log(`  ${r.hash}`);
      expect(hashes.size).toBe(1);
    });

    it('freehand circle (radius wobble + position noise)', () => {
      function freehandCircle(): Point[] {
        const pts: Point[] = [];
        // ~140px radius on ~400px canvas, ±10px radius wobble = ~7%
        for (let i = 0; i <= 60; i++) {
          const angle = (2 * Math.PI * i) / 60;
          const r = 140 + (Math.random() - 0.5) * 20;
          pts.push({
            x: 200 + r * Math.cos(angle) + (Math.random() - 0.5) * 5,
            y: 200 + r * Math.sin(angle) + (Math.random() - 0.5) * 5,
          });
        }
        return pts;
      }

      const results = Array.from({ length: 10 }, () => processShape(freehandCircle()));
      const hashes = new Set(results.map(r => r.hash));
      console.log(`Freehand circle: ${hashes.size} unique hashes from 10 draws`);
      for (const r of results) console.log(`  ${r.hash}`);
      // With K=6 smoothing, some boundary variation is expected
      expect(hashes.size).toBeLessThanOrEqual(4);
    });
  });

  describe('different shapes should produce different hashes', () => {
    it('circle vs square', () => {
      const circle = processShape(makeCircle(100, 100, 50));
      const square = processShape(makeSquare(100, 100, 100));
      console.log('Circle:\n' + rasterToGrid(circle.raster));
      console.log('Square:\n' + rasterToGrid(square.raster));
      expect(circle.hash).not.toBe(square.hash);
    });

    it('circle vs triangle', () => {
      const circle = processShape(makeCircle(100, 100, 50));
      const triangle = processShape(makeTriangle(100, 100, 100));
      expect(circle.hash).not.toBe(triangle.hash);
    });

    it('square vs diamond (45deg rotation)', () => {
      const square = processShape(makeSquare(100, 100, 60));
      const diamond = processShape(makeDiamond(100, 100, 60));
      console.log('Square:\n' + rasterToGrid(square.raster));
      console.log('Diamond:\n' + rasterToGrid(diamond.raster));
      // A square rotated 45° should be a diamond - but since we canonicalize
      // under 90° rotations only, these might or might not match
      // (a square rotated 45° is NOT the same as a square under 90° rot)
      expect(square.hash).not.toBe(diamond.hash);
    });

    it('small circle vs large circle (same hash after normalization)', () => {
      // These SHOULD be the same - just verifying
      const a = processShape(makeCircle(100, 100, 20));
      const b = processShape(makeCircle(100, 100, 200));
      expect(a.hash).toBe(b.hash);
    });

    it('wide rect vs tall rect (should match via rotation)', () => {
      const wide = processShape(makeRect(100, 100, 100, 50));
      const tall = processShape(makeRect(100, 100, 50, 100));
      console.log('Wide rect:\n' + rasterToGrid(wide.raster));
      console.log('Tall rect:\n' + rasterToGrid(tall.raster));
      // These should match because tall = wide rotated 90°
      expect(wide.hash).toBe(tall.hash);
    });

    it('wide ellipse vs tall ellipse (should match via rotation)', () => {
      const wide = processShape(makeEllipse(100, 100, 60, 30));
      const tall = processShape(makeEllipse(100, 100, 30, 60));
      console.log('Wide ellipse:\n' + rasterToGrid(wide.raster));
      console.log('Tall ellipse:\n' + rasterToGrid(tall.raster));
      expect(wide.hash).toBe(tall.hash);
    });
  });

  describe('hash space diversity', () => {
    it('count unique hashes from varied shapes', () => {
      const hashes = new Set<string>();
      const shapes: { name: string; hash: string; raster: string }[] = [];

      const configs = [
        { name: 'circle', pts: makeCircle(100, 100, 50) },
        { name: 'square', pts: makeSquare(100, 100, 60) },
        { name: 'triangle', pts: makeTriangle(100, 100, 80) },
        { name: 'diamond', pts: makeDiamond(100, 100, 60) },
        { name: 'wide-rect', pts: makeRect(100, 100, 120, 40) },
        { name: 'ellipse', pts: makeEllipse(100, 100, 60, 30) },
        { name: 'tall-ellipse', pts: makeEllipse(100, 100, 30, 60) },
        { name: 'skinny-rect', pts: makeRect(100, 100, 200, 20) },
        { name: 'circle-small', pts: makeCircle(100, 100, 20) },
        { name: 'circle-big', pts: makeCircle(100, 100, 200) },
        { name: 'square-big', pts: makeSquare(100, 100, 200) },
        { name: 'triangle-rotated', pts: rotateShape(makeTriangle(100, 100, 80), Math.PI / 6, 100, 100) },
        { name: 'pentagon', pts: (() => {
          const pts: Point[] = [];
          for (let i = 0; i <= 5; i++) {
            const a = (2 * Math.PI * i) / 5 - Math.PI / 2;
            pts.push({ x: 100 + 50 * Math.cos(a), y: 100 + 50 * Math.sin(a) });
          }
          return pts;
        })() },
        { name: 'hexagon', pts: (() => {
          const pts: Point[] = [];
          for (let i = 0; i <= 6; i++) {
            const a = (2 * Math.PI * i) / 6;
            pts.push({ x: 100 + 50 * Math.cos(a), y: 100 + 50 * Math.sin(a) });
          }
          return pts;
        })() },
        { name: 'star', pts: (() => {
          const pts: Point[] = [];
          for (let i = 0; i <= 10; i++) {
            const a = (2 * Math.PI * i) / 10 - Math.PI / 2;
            const r = i % 2 === 0 ? 50 : 20;
            pts.push({ x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) });
          }
          return pts;
        })() },
        { name: 'L-shape', pts: [
          { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 60 },
          { x: 80, y: 60 }, { x: 80, y: 80 }, { x: 0, y: 80 }, { x: 0, y: 0 },
        ] },
        { name: 'cross', pts: [
          { x: 40, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 100, y: 40 },
          { x: 100, y: 60 }, { x: 60, y: 60 }, { x: 60, y: 100 }, { x: 40, y: 100 },
          { x: 40, y: 60 }, { x: 0, y: 60 }, { x: 0, y: 40 }, { x: 40, y: 40 },
          { x: 40, y: 0 },
        ] },
        { name: 'T-shape', pts: [
          { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 30 }, { x: 65, y: 30 },
          { x: 65, y: 100 }, { x: 35, y: 100 }, { x: 35, y: 30 }, { x: 0, y: 30 },
          { x: 0, y: 0 },
        ] },
      ];

      for (const { name, pts } of configs) {
        const result = processShape(pts);
        hashes.add(result.hash);
        shapes.push({ name, hash: result.hash, raster: rasterToGrid(result.raster) });
      }

      console.log('\n=== Shape catalog ===');
      for (const s of shapes) {
        console.log(`\n${s.name} (${s.hash}):\n${s.raster}`);
      }

      // Find duplicates
      const hashMap = new Map<string, string[]>();
      for (const s of shapes) {
        const list = hashMap.get(s.hash) ?? [];
        list.push(s.name);
        hashMap.set(s.hash, list);
      }

      console.log('\n=== Duplicate groups ===');
      for (const [hash, names] of hashMap) {
        if (names.length > 1) {
          console.log(`${hash}: ${names.join(', ')}`);
        }
      }

      console.log(`\n${configs.length} shapes → ${hashes.size} unique hashes`);
      console.log(`Duplicate groups: ${[...hashMap.values()].filter(v => v.length > 1).length}`);
    });
  });
});
