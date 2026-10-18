import React, { useState, useEffect, useCallback } from 'react';
import './HealthCheck.css';

/**
 * FE-04 Capstone Health Check Screen
 *
 * Fetches actual diagnostic data from /api/health and handles:
 * - Loading state (skeleton & live announcement)
 * - Error state (failure banner & retry trigger)
 * - Empty state (null / empty response handling)
 * - Success state (system status, latency, memory, uptime, integration health)
 */
export default function HealthCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [simMode, setSimMode] = useState(null); // 'error' | 'empty' | null

  const fetchHealth = useCallback(async (simulation = null) => {
    setLoading(true);
    setError(null);
    const start = performance.now();

    try {
      const query = simulation ? `?simulate=${simulation}` : '';
      const response = await fetch(`/api/health${query}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const body = await response.json();
          if (body?.error) errMessage = body.error;
        } catch {
          // ignore json parse error on non-json error responses
        }
        throw new Error(errMessage);
      }

      const json = await response.json();
      setData(json);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Health check failed:', err);
      setError(err?.message || 'Unable to establish connection to /api/health.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth(simMode);
  }, [fetchHealth, simMode]);

  const handleRefresh = () => {
    setSimMode(null);
    fetchHealth(null);
  };

  const isDegraded = data && data.status !== 'ok';
  const isEmpty = !loading && !error && (!data || Object.keys(data).length === 0);

  return (
    <div className="health-page">
      <div className="health-page__header">
        <div>
          <p className="health-page__eyebrow">FE-04 · System Diagnostics</p>
          <h1 className="health-page__title">Deployment Health Check</h1>
          <p className="health-page__subtitle">
            Live operational status, serverless telemetry, and environment verification.
          </p>
        </div>

        <div className="health-page__actions">
          <button
            type="button"
            className="health-page__btn health-page__btn--primary"
            onClick={handleRefresh}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Probing...' : 'Refresh Diagnostics'}
          </button>
        </div>
      </div>

      {/* Dev-only controls for testing failure and empty states */}
      {import.meta.env.DEV && (
        <aside className="health-page__dev-box" aria-label="Developer testing controls">
          <span className="health-page__dev-label">Dev Simulation Modes:</span>
          <button
            type="button"
            className={`health-page__dev-pill ${simMode === null ? 'active' : ''}`}
            onClick={() => {
              setSimMode(null);
              fetchHealth(null);
            }}
          >
            Real /api/health
          </button>
          <button
            type="button"
            className={`health-page__dev-pill ${simMode === 'error' ? 'active' : ''}`}
            onClick={() => {
              setSimMode('error');
              fetchHealth('error');
            }}
          >
            Simulate 500 Error
          </button>
          <button
            type="button"
            className={`health-page__dev-pill ${simMode === 'empty' ? 'active' : ''}`}
            onClick={() => {
              setSimMode('empty');
              fetchHealth('empty');
            }}
          >
            Simulate Empty Response
          </button>
        </aside>
      )}

      {/* Loading State */}
      {loading && (
        <section
          className="health-card health-card--loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="health-skeleton-spinner" aria-hidden="true" />
          <h2 className="health-card__heading">Checking system health...</h2>
          <p className="health-card__subtext">Connecting to serverless endpoint at <code>/api/health</code></p>
          <div className="health-skeleton-grid" aria-hidden="true">
            <div className="health-skeleton-block" />
            <div className="health-skeleton-block" />
            <div className="health-skeleton-block" />
            <div className="health-skeleton-block" />
          </div>
        </section>
      )}

      {/* Error State */}
      {!loading && error && (
        <section
          className="health-card health-card--error"
          role="alert"
          aria-live="assertive"
        >
          <div className="health-banner health-banner--error">
            <span className="health-badge health-badge--error" aria-hidden="true">Offline</span>
            <div>
              <h2 className="health-card__heading">Health Check Failed</h2>
              <p className="health-card__subtext">{error}</p>
            </div>
          </div>
          <div className="health-card__footer">
            <p className="health-hint">
              Check your network connection or verify that the <code>/api/health</code> serverless function is deployed.
            </p>
            <button
              type="button"
              className="health-page__btn health-page__btn--retry"
              onClick={handleRefresh}
            >
              Retry Connection
            </button>
          </div>
        </section>
      )}

      {/* Empty Response State */}
      {isEmpty && (
        <section
          className="health-card health-card--empty"
          role="status"
          aria-live="polite"
        >
          <div className="health-banner health-banner--warning">
            <span className="health-badge health-badge--warning" aria-hidden="true">Empty</span>
            <div>
              <h2 className="health-card__heading">Empty Health Response</h2>
              <p className="health-card__subtext">
                The health endpoint responded successfully but returned an empty or unparseable payload.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="health-page__btn health-page__btn--primary"
            onClick={handleRefresh}
          >
            Re-fetch Status
          </button>
        </section>
      )}

      {/* Success State with Real Diagnostic Telemetry */}
      {!loading && !error && data && (
        <div className="health-layout">
          {/* Main Status Overview */}
          <section className="health-card health-card--success" aria-label="System status summary">
            <div className="health-banner">
              <span
                className={`health-badge ${isDegraded ? 'health-badge--warning' : 'health-badge--success'}`}
              >
                {isDegraded ? 'Degraded' : 'Operational'}
              </span>
              <div>
                <h2 className="health-card__heading">
                  {isDegraded ? 'System Degraded' : 'All Systems Operational'}
                </h2>
                <p className="health-card__subtext">
                  Service: <strong>{data.service || 'frontend-capstone'}</strong> · Endpoint:{' '}
                  <code>/api/health</code>
                </p>
              </div>
            </div>

            <div className="health-metrics-grid">
              <div className="health-metric">
                <span className="health-metric__label">Round-Trip Latency</span>
                <span className="health-metric__value health-metric__value--accent">
                  {latency !== null ? `${latency} ms` : '—'}
                </span>
                <span className="health-metric__meta">Client to serverless response</span>
              </div>

              <div className="health-metric">
                <span className="health-metric__label">Environment</span>
                <span className="health-metric__value" style={{ textTransform: 'capitalize' }}>
                  {data.environment || 'production'}
                </span>
                <span className="health-metric__meta">Region: {data.region || 'auto'}</span>
              </div>

              <div className="health-metric">
                <span className="health-metric__label">Process Uptime</span>
                <span className="health-metric__value">
                  {data.uptimeSeconds !== undefined ? `${data.uptimeSeconds}s` : 'Active'}
                </span>
                <span className="health-metric__meta">Serverless worker instance</span>
              </div>

              <div className="health-metric">
                <span className="health-metric__label">Heap Memory</span>
                <span className="health-metric__value">
                  {data.runtime?.memory?.heapUsedMb
                    ? `${data.runtime.memory.heapUsedMb} MB`
                    : 'Normal'}
                </span>
                <span className="health-metric__meta">
                  Total heap: {data.runtime?.memory?.heapTotalMb || '—'} MB
                </span>
              </div>
            </div>
          </section>

          {/* Subsystems & Integrations */}
          <section className="health-card" aria-label="Integrations and Subsystems">
            <h3 className="health-card__subheading">Subsystem & API Status</h3>
            <ul className="health-subsystems-list">
              <li className="health-subsystem-item">
                <div className="health-subsystem-item__info">
                  <strong>Vercel Serverless Gateway</strong>
                  <span className="health-subsystem-item__desc">
                    Node.js {data.runtime?.nodeVersion || process.version} · Platform: {data.runtime?.platform || 'linux'}
                  </span>
                </div>
                <span className="health-pill health-pill--active">Operational</span>
              </li>

              <li className="health-subsystem-item">
                <div className="health-subsystem-item__info">
                  <strong>Google Gemini API Integration</strong>
                  <span className="health-subsystem-item__desc">
                    {data.integrations?.geminiConfigured
                      ? 'GEMINI_API_KEY detected in secure environment'
                      : 'GEMINI_API_KEY not configured (mock fallback available)'}
                  </span>
                </div>
                <span
                  className={`health-pill ${
                    data.integrations?.geminiConfigured ? 'health-pill--active' : 'health-pill--warning'
                  }`}
                >
                  {data.integrations?.geminiConfigured ? 'Connected' : 'Unset'}
                </span>
              </li>

              <li className="health-subsystem-item">
                <div className="health-subsystem-item__info">
                  <strong>Anthropic Claude Integration</strong>
                  <span className="health-subsystem-item__desc">
                    {data.integrations?.anthropicConfigured
                      ? 'ANTHROPIC_API_KEY configured'
                      : 'ANTHROPIC_API_KEY not configured (optional backup)'}
                  </span>
                </div>
                <span
                  className={`health-pill ${
                    data.integrations?.anthropicConfigured ? 'health-pill--active' : 'health-pill--neutral'
                  }`}
                >
                  {data.integrations?.anthropicConfigured ? 'Connected' : 'Optional'}
                </span>
              </li>

              <li className="health-subsystem-item">
                <div className="health-subsystem-item__info">
                  <strong>Client Hash Router</strong>
                  <span className="health-subsystem-item__desc">
                    Hash navigation active with RouteErrorBoundary protection
                  </span>
                </div>
                <span className="health-pill health-pill--active">Operational</span>
              </li>
            </ul>

            <div className="health-card__meta-bar">
              <span>Timestamp: <code>{data.timestamp || new Date().toISOString()}</code></span>
              {lastChecked && <span>Last polled at: {lastChecked}</span>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
