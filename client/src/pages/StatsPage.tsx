import { useState, useEffect } from 'react';
import ProgressBar from '../components/ProgressBar';
import { getStats } from '../api/client';
import { emptyStateStyle } from '../styles';

// Upper bound estimate for distinct canonical shapes on an 8×8 binary grid
// under dihedral symmetry (4 rotations × 2 reflections). The true count of
// connected polyominoes is much smaller, but this serves as a progress ceiling.
const ESTIMATED_TOTAL = 10_000_000;

type LoadState = 'loading' | 'error' | 'ready';

export default function StatsPage() {
  const [discovered, setDiscovered] = useState(0);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    getStats().then(result => {
      if (result) {
        setDiscovered(result.totalDiscovered);
        setState('ready');
      } else {
        setState('error');
      }
    });
  }, []);

  if (state === 'loading') {
    return <div style={emptyStateStyle}>loading...</div>;
  }

  if (state === 'error') {
    return <div style={emptyStateStyle}>could not reach server</div>;
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
