import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { emptyStateStyle } from '../styles';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={emptyStateStyle}>
          something went wrong — try refreshing the page
        </div>
      );
    }
    return this.props.children;
  }
}
