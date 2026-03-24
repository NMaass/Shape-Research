import type { CSSProperties } from 'react';

export const PAGE_MAX_WIDTH = '480px';
export const SECONDARY_COLOR = '#888';
export const BORDER_COLOR = '#eee';
export const SMALL_FONT = '0.875rem';
export const TINY_FONT = '0.6875rem';

export const pageStyle: CSSProperties = {
  maxWidth: PAGE_MAX_WIDTH,
  margin: '2rem auto',
  padding: '0 1.25rem',
};

export const pageTitleStyle: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 'normal',
  marginBottom: '1.5rem',
};

export const bodyTextStyle: CSSProperties = {
  marginBottom: '1rem',
  lineHeight: 1.7,
  fontSize: SMALL_FONT,
};

export const emptyStateStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  paddingTop: '3rem',
  fontSize: SMALL_FONT,
  color: SECONDARY_COLOR,
};

export const secondaryTextStyle: CSSProperties = {
  fontSize: SMALL_FONT,
  color: SECONDARY_COLOR,
};
