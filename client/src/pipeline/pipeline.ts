import type { Point, ShapeResult } from 'shape-research-shared';
import { resample } from './resample';
import { normalize } from './normalize';
import { rasterize } from './rasterize';
import { canonicalize } from './canonical';
import { smoothRaster, dctHash } from './dct';

const RESAMPLE_COUNT = 64;

export interface ProcessedShape extends ShapeResult {
  /** Smoothed raster matching the user's drawn orientation */
  drawnRaster: number[];
}

/**
 * Full pipeline:
 * raw loop → resample → normalize → rasterize (4× supersample)
 *          → smooth (low-freq DCT) → canonicalize → hash
 *
 * Supersampling stabilizes boundary cells. DCT smoothing further absorbs
 * noise so freehand re-draws of the same shape produce the same hash.
 */
export function processShape(loopPoints: Point[]): ProcessedShape {
  const resampled = resample(loopPoints, RESAMPLE_COUNT);
  const normalized = normalize(resampled);
  const raster = rasterize(normalized);
  const smoothed = smoothRaster(raster);
  const canonical = canonicalize(smoothed);
  const hash = dctHash(canonical);

  return { hash, raster: canonical, drawnRaster: smoothed };
}
