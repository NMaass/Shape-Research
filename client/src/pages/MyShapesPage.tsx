import { useMyShapes } from '../store/localStorage';
import FittedShape from '../shape/FittedShape';
import { emptyStateStyle } from '../styles';

export default function MyShapesPage() {
  const shapes = useMyShapes();

  if (shapes.length === 0) {
    return <div style={emptyStateStyle}>no shapes discovered yet — go draw</div>;
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '2rem auto',
      padding: '0 1.25rem',
    }}>
      <h1 style={{ fontSize: '1rem', fontWeight: 'normal', marginBottom: '1.5rem' }}>
        my shapes
      </h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: '1rem',
      }}>
        {shapes.map((shape) => (
          <div key={shape.hash} style={{ textAlign: 'center' }}>
            <FittedShape raster={shape.raster} size={64} />
            <div style={{ fontSize: '0.6875rem', color: '#888', marginTop: '0.25rem' }}>
              {new Date(shape.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
