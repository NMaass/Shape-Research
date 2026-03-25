import { describe, it, expect } from 'vitest';
import { rasterToSvgPath } from './marchingSquares';
import {
  SQUARE_4x4,
  SQUARE_FULL,
  SINGLE_PIXEL,
  H_LINE,
  V_LINE,
  TRIANGLE_UP,
  L_SHAPE,
  T_SHAPE,
  PLUS_SHAPE,
  CIRCLE_ISH,
  EMPTY,
  DIAGONAL,
  TWO_SQUARES,
  HOLLOW_SQUARE,
  CHECKERBOARD,
} from '../test/fixtures';

/** Parse all contours from an SVG path string (split on M commands). */
function parseContours(svgPath: string): { x: number; y: number }[][] {
  const contours: { x: number; y: number }[][] = [];
  // Split on 'M' and process each subpath
  const subpaths = svgPath.trim().split(/(?=M\s)/);
  for (const sub of subpaths) {
    if (!sub.trim()) continue;
    const points: { x: number; y: number }[] = [];
    const commands = sub.match(/[ML]\s[\d.]+\s[\d.]+/g);
    if (!commands) continue;
    for (const cmd of commands) {
      const parts = cmd.trim().split(/\s+/);
      points.push({ x: parseFloat(parts[1]), y: parseFloat(parts[2]) });
    }
    if (points.length >= 2) contours.push(points);
  }
  return contours;
}

/** Check that a contour is closed (first point ≈ last point via Z command). */
function hasZClose(svgPath: string): boolean {
  // Each subpath should end with Z
  const subpaths = svgPath.trim().split(/(?=M\s)/);
  return subpaths.every(s => s.trim().endsWith('Z') || s.trim() === '');
}

/** Check that every contour forms a proper closed loop (no dangling edges). */
function contoursAreClosed(svgPath: string): boolean {
  if (!svgPath.trim()) return true;
  return hasZClose(svgPath);
}

/** Compute bounding box of all points in an SVG path string. */
function pathBounds(svgPath: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const contours = parseContours(svgPath);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of contours) {
    for (const p of c) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

describe('rasterToSvgPath', () => {
  describe('basic output', () => {
    it('returns non-empty path for a filled shape', () => {
      const path = rasterToSvgPath(SQUARE_4x4);
      expect(path.length).toBeGreaterThan(0);
    });

    it('returns a path for empty grid (fallback rects)', () => {
      const path = rasterToSvgPath(EMPTY);
      // Empty grid has no filled cells, so should return empty string
      expect(path).toBe('');
    });

    it('returns a path for a single pixel', () => {
      const path = rasterToSvgPath(SINGLE_PIXEL);
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('contour closure', () => {
    const shapes = [
      ['SQUARE_4x4', SQUARE_4x4],
      ['SQUARE_FULL', SQUARE_FULL],
      ['SINGLE_PIXEL', SINGLE_PIXEL],
      ['H_LINE', H_LINE],
      ['V_LINE', V_LINE],
      ['TRIANGLE_UP', TRIANGLE_UP],
      ['L_SHAPE', L_SHAPE],
      ['T_SHAPE', T_SHAPE],
      ['PLUS_SHAPE', PLUS_SHAPE],
      ['CIRCLE_ISH', CIRCLE_ISH],
      ['DIAGONAL', DIAGONAL],
      ['TWO_SQUARES', TWO_SQUARES],
      ['HOLLOW_SQUARE', HOLLOW_SQUARE],
      ['CHECKERBOARD', CHECKERBOARD],
    ] as const;

    for (const [name, raster] of shapes) {
      it(`${name}: all contours are closed with Z`, () => {
        const path = rasterToSvgPath(raster as number[]);
        expect(contoursAreClosed(path)).toBe(true);
      });
    }
  });

  describe('coordinate bounds', () => {
    it('SQUARE_4x4 contour stays within [0, 8] grid space', () => {
      const path = rasterToSvgPath(SQUARE_4x4);
      const bounds = pathBounds(path);
      expect(bounds.minX).toBeGreaterThanOrEqual(0);
      expect(bounds.minY).toBeGreaterThanOrEqual(0);
      expect(bounds.maxX).toBeLessThanOrEqual(8);
      expect(bounds.maxY).toBeLessThanOrEqual(8);
    });

    it('SQUARE_FULL contour covers the entire grid', () => {
      const path = rasterToSvgPath(SQUARE_FULL);
      const bounds = pathBounds(path);
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(8);
      expect(bounds.maxY).toBe(8);
    });

    it('edge pixels produce contours that close on all four sides', () => {
      // A shape touching the right/bottom edges must produce closed contours
      // This is the key test for the loop bounds fix
      const rightEdge = new Array(64).fill(0);
      rightEdge[7] = 1;  // row 0, col 7
      const path = rasterToSvgPath(rightEdge);
      const contours = parseContours(path);
      expect(contours.length).toBeGreaterThanOrEqual(1);
      expect(contoursAreClosed(path)).toBe(true);
    });

    it('bottom-right corner pixel produces a closed contour', () => {
      const bottomRight = new Array(64).fill(0);
      bottomRight[63] = 1;  // row 7, col 7
      const path = rasterToSvgPath(bottomRight);
      expect(contoursAreClosed(path)).toBe(true);
      const contours = parseContours(path);
      expect(contours.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('contour topology', () => {
    it('SQUARE_4x4 produces a single contour', () => {
      const path = rasterToSvgPath(SQUARE_4x4);
      const contours = parseContours(path);
      expect(contours.length).toBe(1);
    });

    it('TWO_SQUARES produces multiple contours', () => {
      const path = rasterToSvgPath(TWO_SQUARES);
      const contours = parseContours(path);
      expect(contours.length).toBeGreaterThanOrEqual(2);
    });

    it('HOLLOW_SQUARE produces at least 2 contours (inner + outer)', () => {
      const path = rasterToSvgPath(HOLLOW_SQUARE);
      const contours = parseContours(path);
      expect(contours.length).toBeGreaterThanOrEqual(2);
    });

    it('SINGLE_PIXEL produces exactly 1 contour', () => {
      const path = rasterToSvgPath(SINGLE_PIXEL);
      const contours = parseContours(path);
      expect(contours.length).toBe(1);
    });
  });

  describe('contour shape sanity', () => {
    it('SQUARE_4x4 contour is roughly square-shaped', () => {
      const path = rasterToSvgPath(SQUARE_4x4);
      const bounds = pathBounds(path);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      // Aspect ratio should be close to 1:1
      expect(Math.abs(width - height)).toBeLessThan(1);
    });

    it('H_LINE contour is wider than tall', () => {
      const path = rasterToSvgPath(H_LINE);
      const bounds = pathBounds(path);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      expect(width).toBeGreaterThan(height * 2);
    });

    it('V_LINE contour is taller than wide', () => {
      const path = rasterToSvgPath(V_LINE);
      const bounds = pathBounds(path);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      expect(height).toBeGreaterThan(width * 2);
    });
  });
});
