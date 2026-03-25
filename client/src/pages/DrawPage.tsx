import DrawCanvas from '../canvas/DrawCanvas';
import { SECONDARY_COLOR, SMALL_FONT } from '../styles';

export default function DrawPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      padding: '2rem 1.25rem',
    }}>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 'normal',
        marginBottom: '0.25rem',
        letterSpacing: '0.02em',
      }}>
        shape research
      </h1>
      <p style={{
        fontSize: SMALL_FONT,
        color: SECONDARY_COLOR,
        marginBottom: '1.5rem',
      }}>
        draw a closed shape to discover it
      </p>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        aspectRatio: '1',
        border: '1px solid #eee',
        borderRadius: '2px',
        position: 'relative',
        touchAction: 'none',
        overflow: 'hidden',
      }}>
        <DrawCanvas />
      </div>
    </div>
  );
}
