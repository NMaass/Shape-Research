const GRID_SIZE = 8;
const DCT_SIZE = 4; // Extract top-left 4×4

/**
 * Compute 2D Type-II DCT of an 8×8 grid.
 * Extract the top-left 4×4 block (16 low-frequency coefficients).
 * Threshold at median to produce a 64-bit hash.
 */
export function dctHash(raster: number[]): string {
  // Compute 2D DCT coefficients for the top-left 4×4 block
  const coeffs: number[] = [];

  for (let u = 0; u < DCT_SIZE; u++) {
    for (let v = 0; v < DCT_SIZE; v++) {
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
  // Skip DC component (index 0), use remaining 15 coefficients
  // Plus use DC > 0 as bit 0
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

  // Encode as hex string (16 coefficients = 16 bits, but we use full 32-bit words for future expansion)
  const hex = (hashHigh >>> 0).toString(16).padStart(8, '0') +
              (hashLow >>> 0).toString(16).padStart(8, '0');
  return hex;
}

/**
 * Compute Hamming distance between two hex hash strings.
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;

  let dist = 0;
  // Compare 4 bits at a time
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    // Count bits in nibble
    dist += ((xor >> 0) & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return dist;
}
