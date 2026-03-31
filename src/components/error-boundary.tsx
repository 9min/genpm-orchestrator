'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="text-red-400 text-sm font-medium">
          {this.props.label ? `${this.props.label} failed to render` : 'Something went wrong'}
        </div>
        <p className="text-xs text-gray-500 max-w-xs break-all">
          {this.state.error?.message}
        </p>
        <Button variant="ghost" size="sm" onClick={this.reset}>
          Retry
        </Button>
      </div>
    );
  }
}
