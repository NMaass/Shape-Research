import FittedShape from './FittedShape';

interface ShapeGridProps {
  shapes: { raster: number[]; label?: string }[];
  shapeSize?: number;
}

export default function ShapeGrid({ shapes, shapeSize = 48 }: ShapeGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${shapeSize + 16}px, 1fr))`,
      gap: '0.75rem',
    }}>
      {shapes.map((shape, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <FittedShape raster={shape.raster} size={shapeSize} />
          {shape.label && (
            <div style={{ fontSize: '0.6875rem', color: '#888', marginTop: '0.25rem' }}>
              {shape.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
