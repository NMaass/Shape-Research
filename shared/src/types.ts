export const GRID_SIZE = 8;

export interface Point {
  x: number;
  y: number;
}

export interface TimedPoint extends Point {
  t: number;
}

export interface ShapeResult {
  hash: string;
  raster: number[];
  loopPoints: Point[];
}

export interface DiscoveryRecord {
  hash: string;
  raster: number[];
  timestamp: number;
  isNew: boolean;
  discoveryNumber?: number;
  firstDiscovered?: number;
  timesSubmitted?: number;
}
