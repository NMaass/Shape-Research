import { useState, useEffect } from 'react';
import { getLeaderboard } from '../api/client';
import type { LeaderboardEntry } from '../api/client';
import FittedShape from '../shape/FittedShape';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    getLeaderboard().then(setEntries);
  }, []);

  if (entries.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '3rem',
        fontSize: '0.875rem',
        color: '#888',
      }}>
        no discoveries yet
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '2rem auto',
      padding: '0 1.25rem',
    }}>
      <h1 style={{ fontSize: '1rem', fontWeight: 'normal', marginBottom: '1.5rem' }}>
        leaderboard
      </h1>
      {entries.map((entry) => (
        <div key={entry.name} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
        }}>
          <span style={{ color: '#888', width: '1.5rem' }}>{entries.indexOf(entry) + 1}.</span>
          <span style={{ flex: 1 }}>{entry.name}</span>
          <span style={{ color: '#888' }}>{entry.count}</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {entry.recentShapes.slice(0, 4).map((raster, j) => (
              <FittedShape key={j} raster={raster} size={24} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
