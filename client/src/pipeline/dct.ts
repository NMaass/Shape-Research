import { GRID_SIZE } from 'shape-research-shared';

/**
 * Compute 2D Type-II DCT of an 8×8 grid.
 * Extract coefficients, threshold at median to produce a 64-bit hash.
 */
export function dctHash(raster: number[]): string {
  // Compute full 8×8 DCT coefficients (64 total)
  const coeffs: number[] = [];

  for (let u = 0; u < GRID_SIZE; u++) {
    for (let v = 0; v < GRID_SIZE; v++) {
      let sum = 0;
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          sum += raster[x * GRID_SIZE + y] *
            Math.cos((Math.PI / GRID_SIZE) * (x + 0.5) * u) *
            Math.cos((Math.PI / GRID_SIZE) * (y + 0.5) * v);
        }
      }
      coeffs.push(sum);
    }
  }

  // Compute median (excluding DC component at [0])
  const sorted = [...coeffs.slice(1)].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Threshold to produce hash bits
  // DC component uses threshold of 0; all others use median
  let hashHigh = 0;
  let hashLow = 0;

  for (let i = 0; i < coeffs.length; i++) {
    if (coeffs[i] > (i === 0 ? 0 : median)) {
      if (i < 32) {
        hashHigh |= (1 << i);
      } else {
        hashLow |= (1 << (i - 32));
      }
    }
  }

  // Encode as hex string using two 32-bit words (64 bits total)
  const hex = (hashHigh >>> 0).toString(16).padStart(8, '0') +
              (hashLow >>> 0).toString(16).padStart(8, '0');
  return hex;
}
