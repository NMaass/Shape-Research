import { GRID_SIZE } from 'shape-research-shared';

/**
 * Rotate a raster 90 degrees clockwise.
 */
function rotate90(raster: number[]): number[] {
  const result = new Array(GRID_SIZE * GRID_SIZE);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      // (r, c) -> (c, GRID_SIZE - 1 - r)
      result[c * GRID_SIZE + (GRID_SIZE - 1 - r)] = raster[r * GRID_SIZE + c];
    }
  }
  return result;
}

/**
 * Reflect a raster horizontally (left-right flip).
 */
function reflectH(raster: number[]): number[] {
  const result = new Array(GRID_SIZE * GRID_SIZE);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      result[r * GRID_SIZE + (GRID_SIZE - 1 - c)] = raster[r * GRID_SIZE + c];
    }
  }
  return result;
}

/**
 * Compare two rasters lexicographically.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareRasters(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Apply 8-fold dihedral symmetry (4 rotations × 2 reflections)
 * and return the lexicographic minimum as the canonical form.
 */
export function canonicalize(raster: number[]): number[] {
  let min = raster;
  let current = raster;

  // 4 rotations of the original
  for (let i = 0; i < 3; i++) {
    current = rotate90(current);
    if (compareRasters(current, min) < 0) min = current;
  }

  // Reflect, then 4 rotations of the reflection
  current = reflectH(raster);
  if (compareRasters(current, min) < 0) min = current;

  for (let i = 0; i < 3; i++) {
    current = rotate90(current);
    if (compareRasters(current, min) < 0) min = current;
  }

  return min;
}
