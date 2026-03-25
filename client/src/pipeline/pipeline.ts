import type { Point, ShapeResult } from 'shape-research-shared';
import { resample } from './resample';
import { normalize } from './normalize';
import { rasterize } from './rasterize';
import { canonicalize } from './canonical';
import { dctHash } from './dct';

const RESAMPLE_COUNT = 64;

export interface ProcessedShape extends ShapeResult {
  /** Pre-canonical raster matching the user's drawn orientation */
  drawnRaster: number[];
}

/**
 * Full evaluation pipeline:
 * raw loop points → resample → normalize → rasterize → canonicalize → DCT hash
 */
export function processShape(loopPoints: Point[]): ProcessedShape {
  const resampled = resample(loopPoints, RESAMPLE_COUNT);
  const normalized = normalize(resampled);
  const raster = rasterize(normalized);
  const canonical = canonicalize(raster);
  const hash = dctHash(canonical);

  return { hash, raster: canonical, drawnRaster: raster };
}
