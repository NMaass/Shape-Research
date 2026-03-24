import type { Point } from 'shape-research-shared';

/**
 * Arc-length resample a polyline to N evenly spaced points.
 */
export function resample(points: Point[], n: number = 64): Point[] {
  if (points.length < 2) return points;

  // Compute cumulative arc lengths
  const cumLen: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  const totalLen = cumLen[cumLen.length - 1];
  if (totalLen === 0) return [points[0]];

  const step = totalLen / (n - 1);
  const result: Point[] = [{ ...points[0] }];

  let segIdx = 1;

  for (let i = 1; i < n - 1; i++) {
    const targetLen = i * step;

    // Find the segment containing this arc length
    while (segIdx < cumLen.length - 1 && cumLen[segIdx] < targetLen) {
      segIdx++;
    }

    const segStart = cumLen[segIdx - 1];
    const segEnd = cumLen[segIdx];
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (targetLen - segStart) / segLen : 0;

    result.push({
      x: points[segIdx - 1].x + t * (points[segIdx].x - points[segIdx - 1].x),
      y: points[segIdx - 1].y + t * (points[segIdx].y - points[segIdx - 1].y),
    });
  }

  result.push({ ...points[points.length - 1] });
  return result;
}
