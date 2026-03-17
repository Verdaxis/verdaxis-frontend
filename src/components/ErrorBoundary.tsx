import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Functional fallback UI so we can use hooks
const ErrorFallback: React.FC<{ error: Error | null; onRetry: () => void }> = ({ error, onRetry }) => {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="text-red-400 text-xl font-semibold mb-2">{t('error.boundary.title')}</div>
      <p className="text-slate-400 mb-4 max-w-md">
        {error?.message || t('error.generic')}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
      >
        {t('error.boundary.retry')}
      </button>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
