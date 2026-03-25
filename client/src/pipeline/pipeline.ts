import type { Point, ShapeResult } from 'shape-research-shared';
import { resample } from './resample';
import { fitShape, canonicalizeDescriptor, hashDescriptor, reconstructShape } from './fitShape';

const RESAMPLE_COUNT = 128;

/**
 * Full pipeline:
 * raw loop → resample → fit geometric shape (detect corners, angles, edges)
 *          → canonicalize (dihedral symmetry) → hash descriptor
 *
 * Returns:
 * - drawnVertices: clean shape in the user's original pixel space (for canvas display)
 * - vertices: clean shape in [0,1] unit space (for thumbnails)
 * - descriptor/hash: canonical form (for dedup)
 */
export function processShape(loopPoints: Point[]): ShapeResult {
  const resampled = resample(loopPoints, RESAMPLE_COUNT);
  const { descriptor, drawnVertices } = fitShape(resampled);
  const canonical = canonicalizeDescriptor(descriptor);
  const hash = hashDescriptor(canonical);
  const vertices = reconstructShape(canonical);

  return { hash, descriptor: canonical, drawnVertices, vertices };
}
