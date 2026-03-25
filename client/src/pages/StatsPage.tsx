import { useState, useEffect } from 'react';
import ProgressBar from '../components/ProgressBar';
import { getStats } from '../api/client';
import { emptyStateStyle, secondaryTextStyle } from '../styles';

// Upper bound estimate for distinct canonical shapes on an 8×8 binary grid
// under dihedral symmetry (4 rotations × 2 reflections). The true count of
// connected polyominoes is much smaller, but this serves as a progress ceiling.
const ESTIMATED_TOTAL = 10_000_000;

type LoadState = 'loading' | 'error' | 'ready';

export default function StatsPage() {
  const [discovered, setDiscovered] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

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
    return <div style={emptyStateStyle}>loading...</div>;
  }

  if (state === 'error') {
    return (
      <div style={emptyStateStyle}>
        <span style={{ color: '#c44' }}>could not reach server: {errorMsg}</span>
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
      <p style={secondaryTextStyle}>
        {pct}% of shapes have been discovered
      </p>
    </div>
  );
}
