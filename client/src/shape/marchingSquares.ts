import { GRID_SIZE, type Point } from 'shape-research-shared';

/**
 * Marching squares lookup table.
 * Each entry maps a 4-bit cell classification to a list of edge pairs.
 * Edges: 0=top, 1=right, 2=bottom, 3=left
 */
const EDGE_TABLE: number[][] = [
  [],         // 0000
  [3, 0],     // 0001
  [0, 1],     // 0010
  [3, 1],     // 0011
  [1, 2],     // 0100
  [3, 0, 1, 2], // 0101 (saddle)
  [0, 2],     // 0110
  [3, 2],     // 0111
  [2, 3],     // 1000
  [2, 0],     // 1001
  [0, 1, 2, 3], // 1010 (saddle)
  [2, 1],     // 1011
  [1, 3],     // 1100
  [1, 0],     // 1101
  [0, 3],     // 1110
  [],         // 1111
];

function edgeMidpoint(edge: number, row: number, col: number): Point {
  switch (edge) {
    case 0: return { x: col + 0.5, y: row };       // top
    case 1: return { x: col + 1, y: row + 0.5 };   // right
    case 2: return { x: col + 0.5, y: row + 1 };   // bottom
    case 3: return { x: col, y: row + 0.5 };        // left
    default: return { x: col, y: row };
  }
}

/**
 * Generate an SVG path string from an 8×8 binary raster using marching squares.
 * Returns a path suitable for rendering as a filled shape.
 */
export function rasterToSvgPath(raster: number[]): string {
  // Collect line segments from marching squares
  const segments: [Point, Point][] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Classify the four corners of this cell
      // For marching squares on an 8x8 grid, we treat each cell as a pixel
      // and look at 2x2 blocks of cells
      const tl = (row > 0 && col > 0) ? raster[(row - 1) * GRID_SIZE + (col - 1)] : 0;
      const tr = (row > 0 && col < GRID_SIZE) ? raster[(row - 1) * GRID_SIZE + col] : 0;
      const br = (row < GRID_SIZE && col < GRID_SIZE) ? raster[row * GRID_SIZE + col] : 0;
      const bl = (row < GRID_SIZE && col > 0) ? raster[row * GRID_SIZE + (col - 1)] : 0;

      const cellType = (tl << 3) | (tr << 2) | (br << 1) | bl;
      const edges = EDGE_TABLE[cellType];

      for (let i = 0; i < edges.length; i += 2) {
        segments.push([
          edgeMidpoint(edges[i], row, col),
          edgeMidpoint(edges[i + 1], row, col),
        ]);
      }
    }
  }

  if (segments.length === 0) {
    // Fallback: draw filled cells directly as rectangles
    return rasterToRectPath(raster);
  }

  // Chain segments into contours
  const contours = chainSegments(segments);

  // Build SVG path
  let path = '';
  for (const contour of contours) {
    if (contour.length < 2) continue;
    path += `M ${contour[0].x} ${contour[0].y} `;
    for (let i = 1; i < contour.length; i++) {
      path += `L ${contour[i].x} ${contour[i].y} `;
    }
    path += 'Z ';
  }

  return path || rasterToRectPath(raster);
}

/**
 * Fallback: render each filled cell as a rectangle.
 */
function rasterToRectPath(raster: number[]): string {
  let path = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (raster[r * GRID_SIZE + c]) {
        path += `M ${c} ${r} h 1 v 1 h -1 Z `;
      }
    }
  }
  return path;
}

/** Snap a coordinate to 2 decimal places and return a Map key. */
function pointKey(p: Point): string {
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

/**
 * Chain line segments into closed contours using an endpoint map for O(n) lookup.
 */
function chainSegments(segments: [Point, Point][]): Point[][] {
  // Build adjacency map: each snapped endpoint → list of [segmentIndex, otherEndpoint]
  const adj = new Map<string, { idx: number; other: Point }[]>();

  for (let i = 0; i < segments.length; i++) {
    const [a, b] = segments[i];
    const ka = pointKey(a);
    const kb = pointKey(b);

    let listA = adj.get(ka);
    if (!listA) { listA = []; adj.set(ka, listA); }
    listA.push({ idx: i, other: b });

    let listB = adj.get(kb);
    if (!listB) { listB = []; adj.set(kb, listB); }
    listB.push({ idx: i, other: a });
  }

  const used = new Uint8Array(segments.length);
  const contours: Point[][] = [];

  for (let start = 0; start < segments.length; start++) {
    if (used[start]) continue;
    used[start] = 1;

    const contour: Point[] = [segments[start][0], segments[start][1]];

    let extended = true;
    while (extended) {
      extended = false;
      const last = contour[contour.length - 1];
      const key = pointKey(last);
      const neighbors = adj.get(key);
      if (!neighbors) continue;

      for (let n = 0; n < neighbors.length; n++) {
        const entry = neighbors[n];
        if (used[entry.idx]) continue;
        used[entry.idx] = 1;
        contour.push(entry.other);
        extended = true;
        break;
      }
    }

    contours.push(contour);
  }

  return contours;
}
