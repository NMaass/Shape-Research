import { PAGE_MAX_WIDTH, BORDER_COLOR } from '../styles';

interface ProgressBarProps {
  fraction: number;
}

export default function ProgressBar({ fraction }: ProgressBarProps) {
  return (
    <div style={{
      width: '100%',
      maxWidth: PAGE_MAX_WIDTH,
      height: '3px',
      background: BORDER_COLOR,
      borderRadius: '1.5px',
    }}>
      <div style={{
        width: `${Math.min(fraction * 100, 100)}%`,
        height: '100%',
        background: '#111',
        borderRadius: '1.5px',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}
