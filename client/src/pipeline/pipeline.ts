import type { Point } from 'shape-research-shared';
import type { ShapeResult } from 'shape-research-shared';
import { resample } from './resample';
import { normalize } from './normalize';
import { rasterize } from './rasterize';
import { canonicalize } from './canonical';
import { dctHash } from './dct';

/**
 * Full evaluation pipeline:
 * raw loop points → resample → normalize → rasterize → canonicalize → DCT hash
 */
export function processShape(loopPoints: Point[]): ShapeResult {
  // 1. Arc-length resample to 64 evenly spaced points
  const resampled = resample(loopPoints, 64);

  // 2. Normalize: centroid to origin, scale to unit bounding box
  const normalized = normalize(resampled);

  // 3. Rasterize onto 8×8 binary grid
  const raster = rasterize(normalized);

  // 4. Canonicalize via dihedral symmetry (8-fold)
  const canonical = canonicalize(raster);

  // 5. Compute DCT hash
  const hash = dctHash(canonical);

  return {
    hash,
    raster: canonical,
    loopPoints: normalized,
  };
}
