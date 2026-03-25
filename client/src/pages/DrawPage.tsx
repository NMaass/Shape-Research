import { useState } from 'react';
import DrawCanvas from '../canvas/DrawCanvas';
import type { ResultInfo } from '../canvas/DrawCanvas';
import { SECONDARY_COLOR, SMALL_FONT } from '../styles';

export default function DrawPage() {
  const [result, setResult] = useState<ResultInfo>(null);

  const isError = result && 'isError' in result;
  const isNew = result && 'isNew' in result && result.isNew;

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
        border: '1px solid #ddd',
        position: 'relative',
        touchAction: 'none',
        overflow: 'hidden',
      }}>
        <DrawCanvas onResult={setResult} />
      </div>
      <p
        style={{
          fontSize: SMALL_FONT,
          color: isError ? '#c44' : isNew ? '#2a9d2a' : SECONDARY_COLOR,
          minHeight: '1.5em',
          transition: 'opacity 150ms ease',
          opacity: result ? 1 : 0,
        }}
        aria-live="polite"
      >
        {result?.label ?? '\u00A0'}
      </p>
    </div>
  );
}
