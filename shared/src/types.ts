export const GRID_SIZE = 8;

export interface Point {
  x: number;
  y: number;
}

export interface ShapeDescriptor {
  /** Number of vertices/sides. 0 = circle/ellipse. */
  n: number;
  /** Interior angles in degrees, quantized. */
  angles: number[];
  /** Edge length ratios (each / longest), quantized. */
  edgeRatios: number[];
  /** Segment curvature: 0 = straight, positive = outward, negative = inward. */
  bulges: number[];
}

export interface ShapeResult {
  hash: string;
  descriptor: ShapeDescriptor;
  /** Clean vertices in the user's drawn coordinate space (pixel coords). */
  drawnVertices: Point[];
  /** Clean vertices in [0,1] unit space for thumbnail rendering. */
  vertices: Point[];
}

export interface DiscoverResult {
  isNew: boolean;
  discoveryNumber?: number;
  timestamp: string;
  count: number;
}

export interface StatsResult {
  totalDiscovered: number;
}
