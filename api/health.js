/**
 * Vercel Serverless Function — System Health Check
 * Endpoint: GET /api/health
 *
 * Returns real diagnostic metadata for the FE-04 Capstone deployment.
 * Never exposes secret keys or sensitive configuration.
 *
 * @type {import('@vercel/node').VercelApiHandler}
 */
export default async function handler(req, res) {
  // Only allow GET method for health check
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      status: 'error',
      error: 'Method Not Allowed',
      message: `HTTP ${req.method} is not supported on /api/health`,
    });
  }

  // Development-only diagnostic simulations for verifying UI error/empty states
  const isDev = process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';
  const simulate = isDev ? req.query?.simulate : null;

  if (simulate === 'error') {
    return res.status(500).json({
      status: 'error',
      error: 'Simulated 500 Internal Server Error for testing UI error resilience.',
    });
  }

  if (simulate === 'empty') {
    return res.status(200).json(null);
  }

  // Do not cache health check responses
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  const startTime = Date.now();
  const mem = process.memoryUsage();

  const healthData = {
    status: 'ok',
    service: 'frontend-capstone-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    region: process.env.VERCEL_REGION || 'local-dev',
    runtime: {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      },
    },
    integrations: {
      // Check presence of keys without exposing any characters
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    checks: {
      serverlessFunction: 'healthy',
      router: 'operational',
    },
    responseTimeMs: Date.now() - startTime,
  };

  return res.status(200).json(healthData);
}
