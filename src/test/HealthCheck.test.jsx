import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HealthCheck from '../pages/HealthCheck.jsx';
import healthHandler from '../../api/health.js';

describe('HealthCheck UI component (FE-04)', () => {
  const mockSuccessData = {
    status: 'ok',
    service: 'frontend-capstone-api',
    version: '1.0.0',
    timestamp: '2026-10-18T12:00:00.000Z',
    uptimeSeconds: 120,
    environment: 'production',
    region: 'iad1',
    runtime: {
      platform: 'linux',
      nodeVersion: 'v20.10.0',
      memory: {
        heapUsedMb: 42.5,
        heapTotalMb: 78.2,
      },
    },
    integrations: {
      geminiConfigured: true,
      anthropicConfigured: false,
    },
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially with accessible aria attributes', () => {
    global.fetch.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<HealthCheck />);

    const loadingSection = screen.getByRole('status');
    expect(loadingSection).toBeInTheDocument();
    expect(loadingSection).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/checking system health/i)).toBeInTheDocument();
  });

  it('renders operational telemetry and system details upon successful fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessData,
    });

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByText(/all systems operational/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Operational').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/frontend-capstone-api/i)).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('120s')).toBeInTheDocument();
    expect(screen.getByText('42.5 MB')).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini API Integration/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh diagnostics/i })).toBeInTheDocument();
  });

  it('renders accessible error alert and recovers when user clicks retry', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Database / Serverless failed' }),
    });

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/health check failed/i)).toBeInTheDocument();
    expect(screen.getByText(/database \/ serverless failed/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry connection/i });
    expect(retryBtn).toBeInTheDocument();

    // Mock subsequent success
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessData,
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/all systems operational/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('renders empty response message when payload is null or empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByText(/empty health response/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /re-fetch status/i })).toBeInTheDocument();
  });
});

describe('Vercel Serverless /api/health endpoint', () => {
  function createMockRes() {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return res;
  }

  it('rejects non-GET HTTP methods with 405 Method Not Allowed', async () => {
    const req = { method: 'POST', query: {} };
    const res = createMockRes();

    await healthHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers['Allow']).toBe('GET');
    expect(res.body.error).toBe('Method Not Allowed');
  });

  it('returns valid system diagnostic data on GET', async () => {
    const req = { method: 'GET', query: {} };
    const res = createMockRes();

    await healthHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('runtime');
    expect(res.body.runtime).toHaveProperty('memory');
    expect(res.body).toHaveProperty('integrations');
  });
});
