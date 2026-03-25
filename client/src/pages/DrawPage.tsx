import { useState } from 'react';
import DrawCanvas from '../canvas/DrawCanvas';
import type { ResultInfo } from '../canvas/DrawCanvas';
import { getPersonalStats } from '../store/localStorage';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function DrawPage() {
  const [result, setResult] = useState<ResultInfo>(null);
  const personalStats = getPersonalStats();

  const isError = result && 'error' in result;
  const isDiscovery = result && 'discovery' in result;
  const isNew = isDiscovery ? result.discovery.isNew : false;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: '0.75rem',
        color: 'var(--color-muted)',
        marginBottom: '12px',
      }}>
        draw a closed shape to discover it
      </p>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        aspectRatio: '1',
        border: '1px solid var(--color-border)',
        position: 'relative',
        touchAction: 'none',
        overflow: 'hidden',
      }}>
        <DrawCanvas onResult={setResult} />
      </div>

      {/* Result display */}
      <div style={{ marginTop: '32px', minHeight: '60px' }} aria-live="polite">
        {isError && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--color-error)',
            animation: 'fadeIn 0.3s ease-in',
          }}>
            {result.error}
          </div>
        )}
        {isDiscovery && isNew && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--color-success)',
            animation: 'fadeIn 0.3s ease-in',
          }}>
            <span style={{ fontWeight: 600 }}>new shape!</span>
            <div style={{
              marginTop: '4px',
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
            }}>
              discovered just now
            </div>
          </div>
        )}
        {isDiscovery && !isNew && (
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--color-found)',
            animation: 'fadeIn 0.3s ease-in',
          }}>
            <span style={{ fontWeight: 600 }}>already discovered</span>
            <div style={{
              marginTop: '4px',
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
            }}>
              discovered on {formatDate(result.discovery.timestamp)} at {formatTime(result.discovery.timestamp)}
              {result.discovery.count > 1 && ` \u00b7 drawn ${result.discovery.count} times`}
            </div>
          </div>
        )}
      </div>

      {/* Streak notification */}
      {isDiscovery && result.stats.newStreak > 0 && result.stats.newStreak % 5 === 0 && (
        <div style={{
          marginTop: '20px',
          padding: '8px 16px',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: '4px',
          color: 'var(--color-success)',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          animation: 'streakIn 0.4s ease-out',
        }}>
          you're on a new shape streak of {result.stats.newStreak}!
        </div>
      )}
      {isDiscovery && result.stats.foundStreak > 0 && result.stats.foundStreak % 5 === 0 && (
        <div style={{
          marginTop: '20px',
          padding: '8px 16px',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: '4px',
          color: 'var(--color-error)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          animation: 'streakIn 0.4s ease-out',
        }}>
          you've drawn {result.stats.foundStreak} already-found shapes in a row
        </div>
      )}

      {/* Personal stats */}
      {personalStats.count > 0 && (
        <p style={{
          marginTop: '48px',
          fontSize: '0.75rem',
          color: 'var(--color-muted)',
        }}>
          you've found{' '}
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            {personalStats.count}
          </span>{' '}
          new {personalStats.count === 1 ? 'shape' : 'shapes'}
        </p>
      )}
    </div>
  );
}
