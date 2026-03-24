import { useMemo } from 'react';
import { rasterToSvgPath } from './marchingSquares';

interface FittedShapeProps {
  raster: number[];
  size: number;
}

const GRID_SIZE = 8;

export default function FittedShape({ raster, size }: FittedShapeProps) {
  const path = useMemo(() => rasterToSvgPath(raster), [raster]);

  // Add padding around the shape
  const padding = 0.5;
  const viewSize = GRID_SIZE + padding * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-padding} ${-padding} ${viewSize} ${viewSize}`}
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
