import { useMemo } from 'react';
import { GRID_SIZE } from 'shape-research-shared';
import { rasterToSmoothedPath } from './marchingSquares';

interface FittedShapeProps {
  raster: number[];
  size: number;
}

export default function FittedShape({ raster, size }: FittedShapeProps) {
  const rasterKey = JSON.stringify(raster);
  const path = useMemo(() => rasterToSmoothedPath(raster), [rasterKey]);

  // Boundary tracing coordinates span [0, GRID_SIZE]; add a small margin
  const padding = 0.5;
  const viewSize = GRID_SIZE + padding * 2;

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
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#222"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.2"
      />
    </svg>
  );
}
