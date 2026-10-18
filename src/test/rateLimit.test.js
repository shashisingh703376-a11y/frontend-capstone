import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit, clearRateLimitStore } from '../lib/rateLimit.js';

const TEST_IP = '1.2.3.4';

beforeEach(() => {
  clearRateLimitStore();
});

describe('checkRateLimit', () => {
  it('allows the first request', () => {
    const result = checkRateLimit(TEST_IP);
    expect(result.allowed).toBe(true);
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit(TEST_IP);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the request after the limit is reached', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit(TEST_IP);
    }
    const result = checkRateLimit(TEST_IP);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('does not affect a different IP', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit(TEST_IP);
    }
    const result = checkRateLimit('5.6.7.8');
    expect(result.allowed).toBe(true);
  });

  it('resets after reset helper is called', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit(TEST_IP);
    }
    resetRateLimit(TEST_IP);
    const result = checkRateLimit(TEST_IP);
    expect(result.allowed).toBe(true);
  });
});
