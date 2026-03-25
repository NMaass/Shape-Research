import { useMemo } from 'react';
import { GRID_SIZE } from 'shape-research-shared';
import { rasterToSvgPath } from './marchingSquares';

interface FittedShapeProps {
  raster: number[];
  size: number;
}

export default function FittedShape({ raster, size }: FittedShapeProps) {
  const rasterKey = JSON.stringify(raster);
  const path = useMemo(() => rasterToSvgPath(raster), [rasterKey]);

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
        fill="#111"
        stroke="none"
      />
    </svg>
  );
}
