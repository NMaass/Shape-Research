import DrawCanvas from '../canvas/DrawCanvas';
import { SECONDARY_COLOR, SMALL_FONT } from '../styles';

export default function DrawPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '1.25rem',
      gap: '0.75rem',
    }}>
      <p style={{
        fontSize: SMALL_FONT,
        color: SECONDARY_COLOR,
      }}>
        draw a closed shape to discover it
      </p>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        aspectRatio: '1',
        borderBottom: '2px solid #222',
        position: 'relative',
        touchAction: 'none',
        overflow: 'hidden',
      }}>
        <DrawCanvas />
      </div>
    </div>
  );
}
