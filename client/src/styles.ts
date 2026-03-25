import type { CSSProperties } from 'react';

export const PAGE_MAX_WIDTH = '640px';
export const SECONDARY_COLOR = '#888888';
export const BORDER_COLOR = '#e0e0e0';
export const SUCCESS_COLOR = '#22c55e';
export const FOUND_COLOR = '#6366f1';
export const ERROR_COLOR = '#ef4444';
export const SMALL_FONT = '0.875rem';
export const TINY_FONT = '0.75rem';

export const containerStyle: CSSProperties = {
  maxWidth: PAGE_MAX_WIDTH,
  margin: '0 auto',
  padding: '0 24px',
};

export const pageStyle: CSSProperties = {
  padding: '48px 0 80px',
};

export const pageTitleStyle: CSSProperties = {
  fontSize: TINY_FONT,
  fontWeight: 'normal',
  color: SECONDARY_COLOR,
  textTransform: 'lowercase',
  letterSpacing: '0.05em',
  marginBottom: '8px',
};

export const bodyTextStyle: CSSProperties = {
  fontSize: SMALL_FONT,
  color: SECONDARY_COLOR,
  maxWidth: '480px',
  lineHeight: 1.8,
  marginBottom: '16px',
};

export const emptyStateStyle: CSSProperties = {
  padding: '48px 0',
  fontSize: SMALL_FONT,
  color: SECONDARY_COLOR,
};

export const secondaryTextStyle: CSSProperties = {
  fontSize: SMALL_FONT,
  color: SECONDARY_COLOR,
};
