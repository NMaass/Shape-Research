import { useState, useEffect } from 'react';
import ProgressBar from '../components/ProgressBar';
import { getStats } from '../api/client';
import { getPersonalStats, useMyShapes } from '../store/localStorage';
import FittedShape from '../shape/FittedShape';

// Practical shape count: the pipeline reliably distinguishes ~50k shapes given
// its 15° angle quantum, 0.2 edge ratio steps, corner detection limits, and
// 128-point resampling. Theoretical Burnside count is billions, but smoothing
// and detection thresholds collapse most of that space.
const ESTIMATED_TOTAL = 50_000;

type LoadState = 'loading' | 'error' | 'ready';

export default function StatsPage() {
  const [discovered, setDiscovered] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const shapes = useMyShapes();
  const personalStats = getPersonalStats();

  useEffect(() => {
    getStats()
      .then(result => {
        setDiscovered(result.totalDiscovered);
        setState('ready');
      })
      .catch(err => {
        setErrorMsg(err instanceof Error ? err.message : 'unknown error');
        setState('error');
      });
  }, []);

  if (state === 'loading') {
    return (
      <div style={{ padding: '48px 0' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>loading...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ padding: '48px 0' }}>
        <p style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>
          failed to load stats: {errorMsg}
        </p>
      </div>
    );
  }

  const fraction = discovered / ESTIMATED_TOTAL;

  return (
    <div style={{ padding: '48px 0 80px' }}>
      {/* Shapes found */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--color-muted)',
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}>
          shapes found
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 600 }}>
          {discovered.toLocaleString()}{' '}
          <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-muted)' }}>
            out of ~{ESTIMATED_TOTAL.toLocaleString()}
          </span>
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '40px' }}>
        <ProgressBar fraction={fraction} />
      </div>

      {/* Personal contributions */}
      {personalStats.count > 0 && (
        <div style={{
          marginTop: '48px',
          paddingTop: '40px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-muted)',
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}>
            your contributions
          </p>
          <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
            you've found{' '}
            <span style={{ fontWeight: 600 }}>{personalStats.count}</span>{' '}
            new {personalStats.count === 1 ? 'shape' : 'shapes'}
          </p>

          {personalStats.newStreak > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginBottom: '4px' }}>
              current new shape streak: {personalStats.newStreak}
            </p>
          )}
          {personalStats.foundStreak > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginBottom: '4px' }}>
              current already-found streak: {personalStats.foundStreak}
            </p>
          )}
          {personalStats.bestNewStreak > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginBottom: '4px' }}>
              best new shape streak: {personalStats.bestNewStreak}
            </p>
          )}

          {/* Your shapes grid */}
          {shapes.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--color-muted)',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}>
                your shapes
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
                      padding: '4px',
                      border: '1px solid var(--color-border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {shape.vertices && shape.vertices.length > 0 ? (
                      <FittedShape vertices={shape.vertices} size={32} />
                    ) : (
                      <div style={{ width: 32, height: 32, background: 'var(--color-border)' }} />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
