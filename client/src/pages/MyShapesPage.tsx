import { useMyShapes } from '../store/localStorage';
import FittedShape from '../shape/FittedShape';

export default function MyShapesPage() {
  const shapes = useMyShapes();

  if (shapes.length === 0) {
    return (
      <div style={{ padding: '48px 0', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
        no shapes discovered yet — go draw
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <p style={{
        fontSize: '0.75rem',
        color: 'var(--color-muted)',
        letterSpacing: '0.05em',
        marginBottom: '12px',
      }}>
        my shapes
      </p>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        {shapes.map((shape) => (
          <span
            key={shape.hash}
            style={{
              padding: '6px',
              border: '1px solid var(--color-border)',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {shape.vertices && shape.vertices.length > 0 ? (
              <FittedShape vertices={shape.vertices} size={48} />
            ) : (
              <div style={{ width: 48, height: 48, background: 'var(--color-border)' }} />
            )}
            <span style={{ fontSize: '0.625rem', color: 'var(--color-muted)' }}>
              {new Date(shape.timestamp).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
