interface ProgressBarProps {
  fraction: number;
}

export default function ProgressBar({ fraction }: ProgressBarProps) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        width: '100%',
        height: '8px',
        background: 'var(--color-border)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(fraction * 100, 100)}%`,
          height: '100%',
          background: 'var(--color-success)',
          borderRadius: '4px',
          transition: 'width 0.6s ease-out',
        }} />
      </div>
      <p style={{
        marginTop: '6px',
        fontSize: '0.75rem',
        color: 'var(--color-muted)',
      }}>
        {(fraction * 100 < 0.01 && fraction > 0) ? '<0.01' : (fraction * 100).toFixed(2)}% discovered
      </p>
    </div>
  );
}
