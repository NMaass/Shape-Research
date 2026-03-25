import { useMemo } from 'react';
import type { ShapeDescriptor, Point } from 'shape-research-shared';
import { reconstructShape } from '../pipeline/fitShape';

interface FittedShapeProps {
  descriptor: ShapeDescriptor;
  size: number;
}

export default function FittedShape({ descriptor, size }: FittedShapeProps) {
  const key = JSON.stringify(descriptor);
  const vertices = useMemo(() => reconstructShape(descriptor), [key]);

  const path = useMemo(() => {
    if (vertices.length < 2) return '';
    const pts = vertices.map(v => `${r(v.x)} ${r(v.y)}`);
    return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ') + ' Z';
  }, [vertices]);

  // Vertices are in [0,1] unit space
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
