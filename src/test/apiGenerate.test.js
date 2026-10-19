import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import generateHandler, {
  parseStructuredOutput,
  STRUCTURED_SYSTEM_INSTRUCTION,
  PLAIN_SYSTEM_INSTRUCTION,
} from '../../api/generate.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    chunks: [],
    ended: false,
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
    write(chunk) {
      this.chunks.push(chunk);
      return true;
    },
    end() {
      this.ended = true;
    },
    flushHeaders() {},
  };
  return res;
}

describe('parseStructuredOutput helper', () => {
  it('parses valid JSON structured copy package', () => {
    const raw = JSON.stringify({
      headline: 'Next-Gen Audio Experience',
      body: 'Immerse yourself in high-fidelity spatial audio.',
      callToAction: 'Order Today',
      tone: 'Inspiring',
      keyTakeaways: ['40mm titanium drivers', '45h battery life'],
    });

    const parsed = parseStructuredOutput(raw);
    expect(parsed).not.toBeNull();
    expect(parsed.headline).toBe('Next-Gen Audio Experience');
    expect(parsed.body).toBe('Immerse yourself in high-fidelity spatial audio.');
    expect(parsed.callToAction).toBe('Order Today');
    expect(parsed.tone).toBe('Inspiring');
    expect(parsed.keyTakeaways).toHaveLength(2);
  });

  it('strips markdown code fences before parsing JSON', () => {
    const raw =
      '```json\n{\n  "headline": "Clean Sound",\n  "body": "Crystal clear highs.",\n  "callToAction": "Try Now",\n  "tone": "Bold"\n}\n```';
    const parsed = parseStructuredOutput(raw);
    expect(parsed).not.toBeNull();
    expect(parsed.headline).toBe('Clean Sound');
    expect(parsed.callToAction).toBe('Try Now');
  });

  it('extracts fallback key-value fields when raw string contains formatted labels', () => {
    const raw = 'Headline: Exceptional Clarity\nBody: Hear every subtle nuance.\nCTA: Discover More\nTone: Professional';
    const parsed = parseStructuredOutput(raw);
    expect(parsed).not.toBeNull();
    expect(parsed.headline).toBe('Exceptional Clarity');
    expect(parsed.body).toBe('Hear every subtle nuance.');
    expect(parsed.callToAction).toBe('Discover More');
    expect(parsed.tone).toBe('Professional');
  });

  it('returns null for empty or non-string inputs', () => {
    expect(parseStructuredOutput('')).toBeNull();
    expect(parseStructuredOutput(null)).toBeNull();
    expect(parseStructuredOutput(undefined)).toBeNull();
  });
});

describe('Vercel Serverless /api/generate endpoint', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
    const req = { method: 'GET', headers: {}, body: {} };
    const res = createMockRes();

    await generateHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe('Method not allowed');
  });

  it('rejects requests with payload exceeding 8 KB with 413', async () => {
    const req = {
      method: 'POST',
      headers: { 'content-length': '9000' },
      body: { prompt: 'Valid prompt' },
    };
    const res = createMockRes();

    await generateHandler(req, res);

    expect(res.statusCode).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });

  it('rejects empty or whitespace-only prompt with 400', async () => {
    const req = {
      method: 'POST',
      headers: { 'content-length': '50' },
      body: { prompt: '   \n\t  ' },
    };
    const res = createMockRes();

    await generateHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/non-empty string/i);
  });

  it('rejects prompts longer than 1,000 characters with 400', async () => {
    const req = {
      method: 'POST',
      headers: { 'content-length': '1500' },
      body: { prompt: 'x'.repeat(1001) },
    };
    const res = createMockRes();

    await generateHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/1000 characters/i);
  });

  it('handles simulated rate limit error in development mode', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { prompt: 'Valid prompt', simulateError: 'rateLimit' },
    };
    const res = createMockRes();

    await generateHandler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('15');
    expect(res.body.error).toMatch(/too many requests/i);
  });

  it('handles simulated mid-stream disconnection in development mode', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { prompt: 'Valid prompt', simulateError: 'midstream' },
    };
    const res = createMockRes();

    await generateHandler(req, res);

    expect(res.headers['Content-Type']).toMatch(/text\/event-stream/);
    expect(res.ended).toBe(true);
    expect(res.chunks.some((c) => c.includes('Simulated mid-stream failure'))).toBe(true);
  });

  it('returns 500 when neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { prompt: 'Test prompt without API keys' },
    };
    const res = createMockRes();

    await generateHandler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/Server configuration error/i);
  });
});
