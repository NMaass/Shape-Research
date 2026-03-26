import type { Point } from 'shape-research-shared';

/**
 * Geometric shape descriptor — the core representation.
 */
export interface ShapeDescriptor {
  /** Number of vertices/sides. 0 = circle/ellipse. */
  n: number;
  /** Interior angles in degrees, quantized. Length = n. */
  angles: number[];
  /** Edge length ratios (each / longest), quantized. Length = n. */
  edgeRatios: number[];
  /** Segment curvature: 0 = straight, positive = curved outward, negative = inward. */
  bulges: number[];
}

/** Result of fitting — includes both the canonical descriptor and drawn vertices. */
export interface FitResult {
  descriptor: ShapeDescriptor;
  /** The detected corner positions from the original drawing (pixel coords). */
  drawnVertices: Point[];
}

// --- Quantization parameters ---
const ANGLE_QUANTUM = 15;    // degrees — fine enough to distinguish 60/75/90/105/120 while still tolerant of freehand wobble
const RATIO_QUANTUM = 0.2;   // 5 buckets (0.2, 0.4, 0.6, 0.8, 1.0)
const BULGE_QUANTUM = 0.15;
const BULGE_STRAIGHT_THRESHOLD = 0.1;

// --- Corner detection ---

function dpSimplifyIndices(points: Point[], tolerance: number): number[] {
  if (points.length <= 2) return points.map((_, i) => i);

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = dpSimplifyIndices(points.slice(0, maxIdx + 1), tolerance);
    const right = dpSimplifyIndices(points.slice(maxIdx), tolerance).map(i => i + maxIdx);
    return [...left.slice(0, -1), ...right];
  }

  return [0, points.length - 1];
}

function perpDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.sqrt(lenSq);
}

/**
 * Compute turning angle (in degrees) at index i in a closed loop.
 * This is the angle between the incoming and outgoing edge directions.
 * Sharp corners have large turning angles; smooth curves have small ones.
 */
function turningAngle(points: Point[], i: number, windowSize: number): number {
  const n = points.length - 1; // closed
  const prevIdx = ((i - windowSize) % n + n) % n;
  const nextIdx = (i + windowSize) % n;

  const v1x = points[i].x - points[prevIdx].x;
  const v1y = points[i].y - points[prevIdx].y;
  const v2x = points[nextIdx].x - points[i].x;
  const v2y = points[nextIdx].y - points[i].y;

  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;

  return Math.abs(Math.atan2(cross, dot)) * (180 / Math.PI);
}

/**
 * Detect corner vertices in a closed loop.
 * Uses turning angle peaks — points where the path turns sharply.
 */
export function detectCorners(points: Point[]): number[] {
  const n = points.length - 1; // closed loop, last = first
  if (n < 8) return [];

  // Window size for computing turning angle (adaptive to shape size)
  // Larger window = more smoothing = fewer spurious corners from noise
  const window = Math.max(3, Math.floor(n * 0.08));

  // Compute turning angles
  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    angles.push(turningAngle(points, i, window));
  }

  // Threshold: 20° catches obtuse-angle corners (e.g. 160° interior = 20° turn)
  // while the large smoothing window filters out freehand wobble
  const threshold = 20;

  // Find peaks above threshold with non-maximum suppression
  const minSep = Math.max(5, Math.floor(n * 0.10));
  const peaks: { idx: number; angle: number }[] = [];

  for (let i = 0; i < n; i++) {
    if (angles[i] < threshold) continue;

    // Check if this is a local maximum in the window
    let isMax = true;
    for (let j = Math.max(0, i - minSep); j <= Math.min(n - 1, i + minSep); j++) {
      if (j !== i && angles[j] > angles[i]) { isMax = false; break; }
    }
    if (isMax) {
      peaks.push({ idx: i, angle: angles[i] });
    }
  }

  // Sort by angle strength (strongest corners first) for filtering
  peaks.sort((a, b) => b.angle - a.angle);

  // Keep corners with minimum separation
  const kept: number[] = [];
  for (const peak of peaks) {
    let tooClose = false;
    for (const k of kept) {
      const dist = Math.min(Math.abs(peak.idx - k), n - Math.abs(peak.idx - k));
      if (dist < minSep) { tooClose = true; break; }
    }
    if (!tooClose) kept.push(peak.idx);
  }

  return kept.sort((a, b) => a - b);
}

// --- Winding direction ---

/** Compute signed area (positive = CCW, negative = CW). */
function signedArea(points: Point[]): number {
  let area = 0;
  const n = points.length - 1; // closed loop
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

// --- Angle computation ---

/**
 * Compute the interior angle at a vertex, given the polygon's winding.
 * For CCW winding: positive cross → interior angle < 180 (convex vertex)
 * For CW winding: negative cross → interior angle < 180 (convex vertex)
 */
function interiorAngle(prev: Point, vertex: Point, next: Point, ccw: boolean): number {
  const v1x = prev.x - vertex.x;
  const v1y = prev.y - vertex.y;
  const v2x = next.x - vertex.x;
  const v2y = next.y - vertex.y;

  const dot = v1x * v2x + v1y * v2y;
  const cross = v1x * v2y - v1y * v2x;

  // Angle between the two vectors (always positive, 0-180)
  const angle = Math.atan2(Math.abs(cross), dot) * (180 / Math.PI);

  // Determine if this is a convex or concave vertex
  // For CCW polygon: positive cross = convex, for CW: negative cross = convex
  const isConvex = ccw ? cross > 0 : cross < 0;

  return isConvex ? angle : 360 - angle;
}

// --- Bulge computation ---

function computeBulge(points: Point[], startIdx: number, endIdx: number, totalPoints: number): number {
  const baseLen = totalPoints - 1;
  const start = points[startIdx];
  const end = points[endIdx % baseLen];

  const chordDx = end.x - start.x;
  const chordDy = end.y - start.y;
  const chordLen = Math.hypot(chordDx, chordDy);
  if (chordLen === 0) return 0;

  let maxDev = 0;
  let maxAbsDev = 0;

  let i = startIdx;
  while (i !== endIdx % baseLen) {
    const p = points[i % baseLen];
    const dev = (chordDy * (p.x - start.x) - chordDx * (p.y - start.y)) / chordLen;
    if (Math.abs(dev) > maxAbsDev) {
      maxAbsDev = Math.abs(dev);
      maxDev = dev;
    }
    i = (i + 1) % baseLen;
  }

  return maxDev / chordLen;
}

// --- Quantization ---

function quantize(value: number, step: number): number {
  return Math.round(value / step) * step;
}

// --- Ellipse fitting ---

interface EllipseFit {
  ratio: number;       // minor/major axis ratio (0-1)
  angle: number;       // rotation angle of major axis in radians
}

function fitEllipse(points: Point[]): EllipseFit {
  const n = points.length - 1;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += points[i].x; cy += points[i].y; }
  cx /= n; cy /= n;

  let cxx = 0, cyy = 0, cxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = points[i].x - cx;
    const dy = points[i].y - cy;
    cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
  }

  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const l1 = trace / 2 + disc;
  const l2 = trace / 2 - disc;

  // Angle of major axis — standard formula from covariance matrix
  const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);

  if (l1 === 0) return { ratio: 1, angle: 0 };
  return { ratio: Math.sqrt(Math.max(l2, 0) / l1), angle };
}

function makeCircleDescriptor(points: Point[]): ShapeDescriptor {
  const { ratio } = fitEllipse(points);
  const qRatio = quantize(ratio, 0.1);
  if (qRatio >= 0.9) {
    return { n: 0, angles: [], edgeRatios: [], bulges: [1.0] };
  }
  return { n: 0, angles: [], edgeRatios: [qRatio], bulges: [1.0] };
}

// --- FFT-based side count detection ---

/**
 * Detect the number of sides in a near-circular polygon using FFT of the
 * radius-from-centroid signal.
 *
 * A regular N-gon inscribed in a circle produces a radius signal that
 * oscillates N times per revolution. The FFT of this signal shows a
 * strong peak at harmonic N. A true circle has no peaks beyond DC.
 *
 * Returns 0 for circles, or the detected side count (3-12).
 */
function detectSideCountFFT(points: Point[]): number {
  const n = points.length - 1; // closed loop
  if (n < 16) return 0;

  // Compute centroid
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += points[i].x; cy += points[i].y; }
  cx /= n; cy /= n;

  // Compute radius signal (detrended: subtract mean)
  const radii: number[] = [];
  let meanR = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(points[i].x - cx, points[i].y - cy);
    radii.push(r);
    meanR += r;
  }
  meanR /= n;
  if (meanR === 0) return 0;

  // Compute DFT magnitudes for harmonics 2..12
  // (harmonic 1 = ellipticity, not side count)
  let maxMag = 0;
  let maxK = 0;
  const magnitudes: { k: number; mag: number }[] = [];

  for (let k = 2; k <= 12; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const phase = (2 * Math.PI * k * i) / n;
      re += (radii[i] - meanR) * Math.cos(phase);
      im += (radii[i] - meanR) * Math.sin(phase);
    }
    const mag = Math.sqrt(re * re + im * im) / n;
    magnitudes.push({ k, mag });
    if (mag > maxMag) { maxMag = mag; maxK = k; }
  }

  // Normalize by mean radius — the peak magnitude relative to mean radius
  // tells us how "polygon-like" vs "circle-like" the shape is.
  // A regular N-gon has peak magnitude ~= meanR * (1 - cos(pi/N)).
  // For N=8: ~0.076 * meanR. For N=12: ~0.034 * meanR.
  // Freehand noise typically produces peaks < 0.02 * meanR.
  const peakRatio = maxMag / meanR;

  if (peakRatio < 0.01) return 0; // too weak — it's a circle
  if (maxK < 3) return 0; // harmonic 2 is ellipticity, not a polygon

  // Verify the peak is clearly dominant — at least 2.5x the median harmonic.
  // Freehand noise produces broad, flat spectra; real polygons have sharp peaks.
  const mags = magnitudes.map(m => m.mag).sort((a, b) => a - b);
  const median = mags[Math.floor(mags.length / 2)];
  if (maxMag < median * 2.5) return 0;

  return maxK;
}

// --- Main fitting function ---

/** Check if a shape is circle-like by radius variance. */
function isCirclelike(points: Point[]): boolean {
  const n = points.length - 1;
  if (n < 10) return false;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += points[i].x; cy += points[i].y; }
  cx /= n; cy /= n;
  let meanR = 0;
  const radii: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(points[i].x - cx, points[i].y - cy);
    radii.push(r); meanR += r;
  }
  meanR /= n;
  if (meanR === 0) return false;
  let variance = 0;
  for (const r of radii) { const d = (r - meanR) / meanR; variance += d * d; }
  return Math.sqrt(variance / n) < 0.15;
}

export function fitShape(loopPoints: Point[]): FitResult {
  // Always detect corners
  let corners = detectCorners(loopPoints);

  // Determine total turning angle at detected corners
  const n = loopPoints.length - 1;
  const window = Math.max(3, Math.floor(n * 0.08));
  let turningAngleSum = 0;
  for (const ci of corners) {
    turningAngleSum += turningAngle(loopPoints, ci, window);
  }

  // Circle detection using total turning angle at corners.
  // For any real N-gon, the exterior angles sum to exactly 360°. So the
  // detected corner turning angles should account for most of that 360°.
  // For a freehand circle, "corners" are noise — their turning angles sum
  // to much less than 360° because the real curvature is distributed smoothly.
  // Threshold: 85% of 360° (306°). Real polygons hit ~360°, noisy circles
  // typically sum to 180-280° even with many spurious corners.
  let circlelike = isCirclelike(loopPoints) && turningAngleSum < 306;

  // FFT of radius signal detects polygon periodicity even when individual
  // corners are too soft for turning-angle detection. This catches octagons
  // and other many-sided polygons.
  const fftSides = detectSideCountFFT(loopPoints);

  // If FFT sees a polygon, override circle classification
  if (circlelike && fftSides >= 3) {
    circlelike = false;
  }

  // If corner detection found fewer corners than FFT expects, use FFT count
  // to place corners at evenly-spaced positions (best guess for regular polygon).
  if (fftSides >= 3 && corners.length < fftSides) {
    const step = Math.round((loopPoints.length - 1) / fftSides);
    corners = Array.from({ length: fftSides }, (_, i) => i * step);
  }

  if (circlelike || corners.length < 2) {
    // For circles, build drawn vertices from a fitted ellipse
    const n = loopPoints.length - 1;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += loopPoints[i].x; cy += loopPoints[i].y; }
    cx /= n; cy /= n;
    let meanR = 0;
    for (let i = 0; i < n; i++) meanR += Math.hypot(loopPoints[i].x - cx, loopPoints[i].y - cy);
    meanR /= n;

    const { ratio, angle: ellipseAngle } = fitEllipse(loopPoints);
    const qRatio = quantize(ratio, 0.1);

    // Generate clean circle/ellipse at original position, size, AND rotation
    const cosA = Math.cos(ellipseAngle);
    const sinA = Math.sin(ellipseAngle);
    const nPts = 64;
    const drawnVertices: Point[] = [];
    for (let i = 0; i <= nPts; i++) {
      const t = (2 * Math.PI * i) / nPts;
      // Ellipse in local frame, then rotate to match drawn orientation
      const lx = meanR * Math.cos(t);
      const ly = meanR * ratio * Math.sin(t);
      drawnVertices.push({
        x: cx + lx * cosA - ly * sinA,
        y: cy + lx * sinA + ly * cosA,
      });
    }

    const descriptor = qRatio >= 0.9
      ? { n: 0, angles: [], edgeRatios: [], bulges: [1.0] }
      : { n: 0, angles: [], edgeRatios: [qRatio], bulges: [1.0] };

    return { descriptor, drawnVertices };
  }

  const baseLen = loopPoints.length - 1;
  const nCorners = corners.length;
  // In screen coordinates (Y-down), positive shoelace area = clockwise
  const ccw = signedArea(loopPoints) < 0;

  // Build drawnVertices: trace through corner points, preserving curved edges.
  // For straight edges, just connect corners. For curved edges, include
  // intermediate points from the drawn stroke to preserve the curvature.

  // Compute angles at each corner
  const rawAngles: number[] = [];
  for (let i = 0; i < nCorners; i++) {
    const prevIdx = corners[(i - 1 + nCorners) % nCorners];
    const currIdx = corners[i];
    const nextIdx = corners[(i + 1) % nCorners];
    rawAngles.push(interiorAngle(loopPoints[prevIdx], loopPoints[currIdx], loopPoints[nextIdx], ccw));
  }

  // Compute edge lengths and bulges
  const rawEdges: number[] = [];
  const rawBulges: number[] = [];
  for (let i = 0; i < nCorners; i++) {
    const startIdx = corners[i];
    const endIdx = corners[(i + 1) % nCorners];
    const start = loopPoints[startIdx];
    const end = loopPoints[endIdx % baseLen];
    rawEdges.push(Math.hypot(end.x - start.x, end.y - start.y));
    rawBulges.push(computeBulge(loopPoints, startIdx, endIdx, loopPoints.length));
  }

  // Normalize edge ratios
  const maxEdge = Math.max(...rawEdges);
  const edgeRatios = maxEdge > 0 ? rawEdges.map(e => e / maxEdge) : rawEdges.map(() => 1);

  // Quantize
  const angles = rawAngles.map(a => quantize(a, ANGLE_QUANTUM));
  const qEdgeRatios = edgeRatios.map(r => quantize(r, RATIO_QUANTUM));
  const bulges = rawBulges.map(b => {
    if (Math.abs(b) < BULGE_STRAIGHT_THRESHOLD) return 0;
    return quantize(b, BULGE_QUANTUM);
  });

  // Build drawnVertices with curvature: straight edges get 2 points,
  // curved edges get intermediate points from the original stroke.
  const drawnVertices: Point[] = [];
  const PTS_PER_CURVED_EDGE = 16;
  for (let i = 0; i < nCorners; i++) {
    const startIdx = corners[i];
    const endIdx = corners[(i + 1) % nCorners];
    drawnVertices.push({ ...loopPoints[startIdx] });

    if (bulges[i] !== 0) {
      // Curved edge: sample points along the original drawn stroke
      let segLen = endIdx > startIdx
        ? endIdx - startIdx
        : baseLen - startIdx + endIdx;
      for (let s = 1; s < PTS_PER_CURVED_EDGE; s++) {
        const frac = s / PTS_PER_CURVED_EDGE;
        const idx = (startIdx + Math.round(frac * segLen)) % baseLen;
        drawnVertices.push({ ...loopPoints[idx] });
      }
    }
    // straight edges: just the corner point (next corner added in next iteration)
  }
  drawnVertices.push({ ...drawnVertices[0] }); // close

  return {
    descriptor: { n: nCorners, angles, edgeRatios: qEdgeRatios, bulges },
    drawnVertices,
  };
}

// --- Canonicalization ---

export function canonicalizeDescriptor(desc: ShapeDescriptor): ShapeDescriptor {
  if (desc.n <= 1) return desc;

  const { n, angles, edgeRatios, bulges } = desc;

  function serialize(a: number[], r: number[], b: number[]): string {
    return a.join(',') + '|' + r.join(',') + '|' + b.join(',');
  }

  let bestStr = serialize(angles, edgeRatios, bulges);
  let bestA = angles, bestR = edgeRatios, bestB = bulges;

  for (let rot = 0; rot < n; rot++) {
    const rA = [...angles.slice(rot), ...angles.slice(0, rot)];
    const rR = [...edgeRatios.slice(rot), ...edgeRatios.slice(0, rot)];
    const rB = [...bulges.slice(rot), ...bulges.slice(0, rot)];
    const s = serialize(rA, rR, rB);
    if (s < bestStr) { bestStr = s; bestA = rA; bestR = rR; bestB = rB; }

    // Reflected: reverse vertex order, shift edges to realign
    const refA = [...rA].reverse();
    const refR = [rR[0], ...rR.slice(1).reverse()];
    const refB = rB.map(b => -b);
    const refBR = [refB[0], ...refB.slice(1).reverse()];

    const sRef = serialize(refA, refR, refBR);
    if (sRef < bestStr) { bestStr = sRef; bestA = refA; bestR = refR; bestB = refBR; }
  }

  return { n, angles: bestA, edgeRatios: bestR, bulges: bestB };
}

// --- Hashing ---

export function hashDescriptor(desc: ShapeDescriptor): string {
  if (desc.n === 0) {
    if (desc.edgeRatios.length === 0) return 'circle';
    return `ellipse-${desc.edgeRatios[0]}`;
  }
  return [
    `${desc.n}`,
    desc.angles.join('.'),
    desc.edgeRatios.join('.'),
    desc.bulges.join('.'),
  ].join('-');
}

// --- Clean shape reconstruction ---

export function reconstructShape(desc: ShapeDescriptor): Point[] {
  if (desc.n === 0) {
    const aspectRatio = desc.edgeRatios.length > 0 ? desc.edgeRatios[0] : 1;
    const nPts = 64;
    const pts: Point[] = [];
    for (let i = 0; i <= nPts; i++) {
      const angle = (2 * Math.PI * i) / nPts;
      pts.push({
        x: 0.5 + 0.45 * Math.cos(angle),
        y: 0.5 + 0.45 * aspectRatio * Math.sin(angle),
      });
    }
    return pts;
  }

  const { n, angles, edgeRatios } = desc;
  const exteriorAngles = angles.map(a => 180 - a);

  const vertices: Point[] = [];
  let heading = 0;
  let x = 0, y = 0;

  for (let i = 0; i < n; i++) {
    vertices.push({ x, y });
    const rad = heading * Math.PI / 180;
    x += edgeRatios[i] * Math.cos(rad);
    y += edgeRatios[i] * Math.sin(rad);
    heading += exteriorAngles[(i + 1) % n];
  }

  // Fit into unit square
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = 0.85 / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const normalized = vertices.map(v => ({
    x: (v.x - cx) * scale + 0.5,
    y: (v.y - cy) * scale + 0.5,
  }));

  normalized.push({ ...normalized[0] });
  return normalized;
}
