/**
 * In-memory rate limiter using a sliding-window counter.
 *
 * ⚠️  Vercel Serverless Functions can run across multiple isolated instances,
 *     so this in-memory store does NOT coordinate across instances. For a
 *     single-instance or low-traffic deployment it still provides meaningful
 *     protection. For high-traffic multi-instance production use, replace the
 *     store with an external shared store (e.g. Vercel KV / Upstash Redis).
 *
 * Exported so it can be imported by both the API handler and tests.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;  // per IP per window

// Map<ip, { count: number, windowStart: number }>
const store = new Map();

/**
 * @param {string} ip
 * @returns {{ allowed: boolean, retryAfterSeconds: number }}
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // New window
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count < MAX_REQUESTS) {
    entry.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
  return { allowed: false, retryAfterSeconds };
}

/**
 * Reset state for a specific IP. Used in tests.
 * @param {string} ip
 */
export function resetRateLimit(ip) {
  store.delete(ip);
}

/**
 * Clear all rate-limit state. Used in tests.
 */
export function clearRateLimitStore() {
  store.clear();
}
