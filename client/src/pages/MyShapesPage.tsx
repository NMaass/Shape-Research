import { useMyShapes } from '../store/localStorage';
import FittedShape from '../shape/FittedShape';
import { pageStyle, pageTitleStyle, emptyStateStyle, TINY_FONT, SECONDARY_COLOR } from '../styles';

export default function MyShapesPage() {
  const shapes = useMyShapes();

  if (shapes.length === 0) {
    return <div style={emptyStateStyle}>no shapes discovered yet — go draw</div>;
  }

  return (
    <div style={pageStyle}>
      <h1 style={pageTitleStyle}>my shapes</h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: '1rem',
      }}>
        {shapes.map((shape) => (
          <div key={shape.hash} style={{ textAlign: 'center' }}>
            <FittedShape raster={shape.raster} size={64} />
            <div style={{ fontSize: TINY_FONT, color: SECONDARY_COLOR, marginTop: '0.25rem' }}>
              {new Date(shape.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
