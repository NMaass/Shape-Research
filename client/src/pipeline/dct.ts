import { GRID_SIZE } from 'shape-research-shared';

/**
 * How many low-frequency DCT coefficients to keep per axis.
 * 6×6 = 36 → absorbs high-frequency noise while preserving shape features
 * like corners, stems, and concavities.
 */
const SMOOTH_SIZE = 6;

/**
 * Compute the full 8×8 2D Type-II DCT coefficient matrix.
 */
function dct2d(raster: number[]): number[][] {
  const coeffs: number[][] = [];
  for (let u = 0; u < GRID_SIZE; u++) {
    coeffs[u] = [];
    for (let v = 0; v < GRID_SIZE; v++) {
      let sum = 0;
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          sum += raster[x * GRID_SIZE + y] *
            Math.cos((Math.PI / GRID_SIZE) * (x + 0.5) * u) *
            Math.cos((Math.PI / GRID_SIZE) * (y + 0.5) * v);
        }
      }
      coeffs[u][v] = sum;
    }
  }
  return coeffs;
}

/**
 * Inverse 2D DCT using only low-frequency coefficients.
 */
function idct2dSmooth(coeffs: number[][]): number[] {
  const result = new Array(GRID_SIZE * GRID_SIZE);
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      let sum = 0;
      for (let u = 0; u < SMOOTH_SIZE; u++) {
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        for (let v = 0; v < SMOOTH_SIZE; v++) {
          const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
          sum += cu * cv * coeffs[u][v] *
            Math.cos((Math.PI / GRID_SIZE) * (x + 0.5) * u) *
            Math.cos((Math.PI / GRID_SIZE) * (y + 0.5) * v);
        }
      }
      result[x * GRID_SIZE + y] = (2 / GRID_SIZE) * sum;
    }
  }
  return result;
}

/**
 * Low-frequency smooth: DCT → keep only low-freq → inverse DCT → threshold at mean.
 * Absorbs boundary pixel wobble from freehand drawing.
 */
export function smoothRaster(raster: number[]): number[] {
  const coeffs = dct2d(raster);
  const smooth = idct2dSmooth(coeffs);
  let sum = 0;
  for (const v of smooth) sum += v;
  const mean = sum / smooth.length;
  return smooth.map(v => v > mean ? 1 : 0);
}

/**
 * Hash a binary raster by encoding it as a hex string.
 * Each bit corresponds to one cell in the 8×8 grid (64 bits total).
 */
export function dctHash(raster: number[]): string {
  let high = 0;
  let low = 0;
  for (let i = 0; i < raster.length; i++) {
    if (raster[i]) {
      if (i < 32) {
        high = (high | (1 << i)) >>> 0;
      } else {
        low = (low | (1 << (i - 32))) >>> 0;
      }
    }
  }
  return (high >>> 0).toString(16).padStart(8, '0') +
         (low >>> 0).toString(16).padStart(8, '0');
}
