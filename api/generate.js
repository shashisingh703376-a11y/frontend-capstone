import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '../src/lib/rateLimit.js';

// Max streaming duration Vercel allows on Hobby (60 s). Pro supports up to 300 s.
export const maxDuration = 30;

const MAX_PROMPT_LENGTH = 1000; // characters
const MAX_BODY_BYTES = 8192; // 8 KB

/** @type {import('@vercel/node').VercelRequest} */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Use the forwarded IP, falling back to the socket address.
  const ip =
    (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const rateLimitResult = checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfterSeconds));
    return res.status(429).json({
      error: 'Too many requests. Please wait before trying again.',
      retryAfter: rateLimitResult.retryAfterSeconds,
    });
  }

  // ── Input validation ───────────────────────────────────────────────────────
  // Guard against excessively large request bodies.
  const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request body too large.' });
  }

  const { prompt } = req.body ?? {};

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'prompt must be a non-empty string.' });
  }

  const trimmedPrompt = prompt.trim();

  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`,
    });
  }

  // ── Anthropic call ─────────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a concise copywriting assistant. Respond with only the requested copy — no preamble, no explanation.\n\n${trimmedPrompt}`,
        },
      ],
    });

    const text =
      message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('') || 'No response generated.';

    return res.status(200).json({ title: 'Generated output', body: text });
  } catch (err) {
    // Log full error server-side; never expose it to the client.
    console.error('Anthropic API error:', err);

    if (err?.status === 429) {
      return res.status(502).json({ error: 'AI provider is rate-limited. Please try again shortly.' });
    }

    if (err?.status >= 500) {
      return res.status(502).json({ error: 'AI provider is temporarily unavailable.' });
    }

    return res.status(500).json({ error: 'Generation failed. Please try again.' });
  }
}
