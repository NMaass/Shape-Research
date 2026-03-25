import type { Point, ShapeResult } from 'shape-research-shared';
import { resample } from './resample';
import { fitShape, canonicalizeDescriptor, hashDescriptor, reconstructShape } from './fitShape';

const RESAMPLE_COUNT = 128;

/**
 * Full pipeline:
 * raw loop → resample → fit geometric shape (detect corners, angles, edges)
 *          → canonicalize (dihedral symmetry) → hash descriptor
 *
 * Returns a clean geometric descriptor and reconstructed vertices for rendering.
 */
export function processShape(loopPoints: Point[]): ShapeResult {
  const resampled = resample(loopPoints, RESAMPLE_COUNT);
  const descriptor = fitShape(resampled);
  const canonical = canonicalizeDescriptor(descriptor);
  const hash = hashDescriptor(canonical);
  const vertices = reconstructShape(canonical);

  return { hash, descriptor: canonical, vertices };
}
