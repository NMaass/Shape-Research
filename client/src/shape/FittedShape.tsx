import { useMemo } from 'react';
import type { Point } from 'shape-research-shared';

interface FittedShapeProps {
  /** Pre-normalized [0,1] vertices to display. */
  vertices: Point[];
  size: number;
}

export default function FittedShape({ vertices, size }: FittedShapeProps) {
  const path = useMemo(() => {
    if (vertices.length < 2) return '';
    const pts = vertices.map(v => `${r(v.x)} ${r(v.y)}`);
    return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ') + ' Z';
  }, [vertices]);

  const padding = 0.08;
  const viewSize = 1 + padding * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-padding} ${-padding} ${viewSize} ${viewSize}`}
      role="img"
      aria-label="shape"
      style={{ display: 'block' }}
    >
      <path
        d={path}
        fill="none"
        stroke="#222"
        strokeWidth={0.03}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function r(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}
