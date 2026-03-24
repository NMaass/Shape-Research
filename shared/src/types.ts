export const GRID_SIZE = 8;

export interface Point {
  x: number;
  y: number;
}

export interface ShapeResult {
  hash: string;
  raster: number[];
}

export interface DiscoverResult {
  isNew: boolean;
  discoveryNumber?: number;
}

export interface StatsResult {
  totalDiscovered: number;
}

export interface LeaderboardEntry {
  name: string;
  count: number;
  recentShapes: number[][];
}
