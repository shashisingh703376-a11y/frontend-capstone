import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '../src/lib/rateLimit.js';

// Max streaming duration Vercel allows on Hobby (60 s). Pro supports up to 300 s.
export const maxDuration = 30;

const MAX_PROMPT_LENGTH = 1000; // characters
const MAX_BODY_BYTES = 8192; // 8 KB

/**
 * Call Google Gemini API (100% free at https://aistudio.google.com/app/apikey)
 * @param {string} apiKey
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callGemini(apiKey, prompt) {
  // gemini-1.5-flash and gemini-2.0-flash are fast and free
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `You are a concise copywriting assistant. Respond with only the requested copy — no preamble, no explanation.\n\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 256,
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const err = new Error(errData?.error?.message || `Gemini request failed with status ${response.status}`);
    err.status = response.status;
    err.details = errData;
    throw err;
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    'No response generated.'
  );
}

/**
 * Call Anthropic Claude API (requires paid credit at console.anthropic.com)
 * @param {string} apiKey
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callAnthropic(apiKey, prompt) {
  const client = new Anthropic({ apiKey });
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

  let message;
  try {
    message = await client.messages.create({
      model: modelName,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a concise copywriting assistant. Respond with only the requested copy — no preamble, no explanation.\n\n${prompt}`,
        },
      ],
    });
  } catch (primaryErr) {
    if (primaryErr?.status === 404 && modelName !== 'claude-3-haiku-20240307') {
      message = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `You are a concise copywriting assistant. Respond with only the requested copy — no preamble, no explanation.\n\n${prompt}`,
          },
        ],
      });
    } else {
      throw primaryErr;
    }
  }

  return (
    message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('') || 'No response generated.'
  );
}

/** @type {import('@vercel/node').VercelRequest} */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
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

  // ── AI Provider Selection ──────────────────────────────────────────────────
  // Prefers GEMINI_API_KEY (free), falls back to ANTHROPIC_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!geminiKey && !anthropicKey) {
    return res.status(500).json({
      error: 'Server configuration error: Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured in Vercel.',
    });
  }

  try {
    let text;
    if (geminiKey) {
      text = await callGemini(geminiKey, trimmedPrompt);
    } else {
      text = await callAnthropic(anthropicKey, trimmedPrompt);
    }

    return res.status(200).json({ title: 'Generated output', body: text });
  } catch (err) {
    console.error('AI provider error:', err);

    if (err?.status === 429) {
      return res.status(502).json({ error: 'AI provider rate-limited. Please wait a few seconds and retry.' });
    }

    if (err?.status === 400 || err?.status === 401 || err?.status === 403) {
      const provider = geminiKey ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
      return res.status(500).json({
        error: `Invalid API key or unauthorized. Please verify ${provider} in Vercel.`,
      });
    }

    if (err?.status >= 500) {
      return res.status(502).json({ error: 'AI provider is temporarily unavailable.' });
    }

    const safeMessage =
      typeof err?.message === 'string' && !err.message.includes('AIza') && !err.message.includes('sk-')
        ? err.message
        : 'Generation failed. Please try again.';

    return res.status(500).json({ error: safeMessage });
  }
}
