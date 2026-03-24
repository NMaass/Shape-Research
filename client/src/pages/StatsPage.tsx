import { useState, useEffect } from 'react';
import ProgressBar from '../components/ProgressBar';
import { getStats } from '../api/client';

const ESTIMATED_TOTAL = 10_000_000;

export default function StatsPage() {
  const [discovered, setDiscovered] = useState<number | null>(null);

  useEffect(() => {
    getStats().then(s => setDiscovered(s.totalDiscovered));
  }, []);

  if (discovered === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '3rem',
        fontSize: '0.875rem',
        color: '#888',
      }}>
        loading...
      </div>
    );
  }

  const fraction = discovered / ESTIMATED_TOTAL;
  const pct = (fraction * 100).toFixed(3);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '1rem',
      padding: '0 1.25rem',
    }}>
      <ProgressBar fraction={fraction} />
      <p style={{ fontSize: '0.875rem', color: '#888' }}>
        {pct}% of shapes have been discovered
      </p>
    </div>
  );
}
