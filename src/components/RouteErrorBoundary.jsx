import React from 'react';

/**
 * Route-level Error Boundary (equivalent to Next.js error.tsx boundary).
 * Catches unhandled runtime exceptions thrown during page rendering,
 * displays an accessible error announcement with recovery controls,
 * and prevents the entire application from crashing.
 */
export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('RouteErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV !== 'production';
      const safeMessage =
        this.state.error?.message && isDev
          ? this.state.error.message
          : 'An unexpected application error occurred while loading this view.';

      return (
        <section
          className="route-error-boundary"
          role="alert"
          aria-live="assertive"
          style={{
            maxWidth: '640px',
            margin: '2rem auto',
            padding: '2rem',
            background: 'var(--bg-elevated)',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            color: 'var(--text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--error-soft)',
                color: 'var(--error)',
                fontWeight: 'bold',
                fontSize: '1.2rem',
              }}
              aria-hidden="true"
            >
              !
            </span>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Something went wrong</h1>
          </div>

          <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem', lineHeight: '1.6' }}>
            {safeMessage}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReset}
              className="retry-btn"
              style={{
                minHeight: '42px',
                padding: '0 1.25rem',
                borderRadius: '999px',
                border: '1px solid var(--accent)',
                background: 'var(--accent)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="ghost-btn"
              style={{
                minHeight: '42px',
                padding: '0 1.25rem',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
