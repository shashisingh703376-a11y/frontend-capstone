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

  // Use a valid Anthropic model: claude-3-5-haiku-20241022 (fast, capable)
  // or fall back to claude-3-haiku-20240307 if specified
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

  try {
    let message;
    try {
      message = await client.messages.create({
        model: modelName,
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `You are a concise copywriting assistant. Respond with only the requested copy — no preamble, no explanation.\n\n${trimmedPrompt}`,
          },
        ],
      });
    } catch (primaryErr) {
      // If 3.5 haiku isn't enabled or throws not_found, fall back to claude-3-haiku-20240307
      if (primaryErr?.status === 404 && modelName !== 'claude-3-haiku-20240307') {
        console.warn('Falling back to claude-3-haiku-20240307');
        message = await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 256,
          messages: [
            {
              role: 'user',
              content: `You are a concise copywriting assistant. Respond with only the requested copy — no preamble, no explanation.\n\n${trimmedPrompt}`,
            },
          ],
        });
      } else {
        throw primaryErr;
      }
    }

    const text =
      message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('') || 'No response generated.';

    return res.status(200).json({ title: 'Generated output', body: text });
  } catch (err) {
    // Log full error server-side; never expose secrets to the client.
    console.error('Anthropic API error:', err);

    if (err?.status === 429) {
      return res.status(502).json({ error: 'AI provider is rate-limited. Please try again shortly.' });
    }

    if (err?.status === 401) {
      return res.status(500).json({
        error: 'Invalid AI API key or unauthorized. Please verify ANTHROPIC_API_KEY in Vercel.',
      });
    }

    if (err?.status === 400 && err?.message?.toLowerCase().includes('credit')) {
      return res.status(502).json({
        error: 'AI provider account credit balance is too low.',
      });
    }

    if (err?.status >= 500) {
      return res.status(502).json({ error: 'AI provider is temporarily unavailable.' });
    }

    const safeMessage =
      typeof err?.error?.message === 'string' && !err.error.message.includes('sk-')
        ? err.error.message
        : 'Generation failed. Please try again.';

    return res.status(500).json({ error: safeMessage });
  }
}
