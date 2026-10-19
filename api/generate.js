import { GoogleGenAI } from '@google/genai';
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
export const STRUCTURED_SYSTEM_INSTRUCTION =
  'You are an expert marketing copywriting assistant. Return your response strictly as a JSON object matching this schema:\n' +
  '{\n' +
  '  "headline": "Punchy, attention-grabbing title",\n' +
  '  "body": "Compelling core narrative (2-3 sentences)",\n' +
  '  "callToAction": "Short, persuasive button CTA (2-4 words)",\n' +
  '  "tone": "Tone descriptor (e.g. Bold, Friendly, Urgency, Inspiring)",\n' +
  '  "keyTakeaways": ["Key differentiator or bullet 1", "Key differentiator or bullet 2", "Key differentiator or bullet 3"]\n' +
  '}\n' +
  'Respond strictly with valid JSON. No markdown code fences, no explanations.';

export const PLAIN_SYSTEM_INSTRUCTION =
  'You are a concise copywriting assistant. Respond with only the requested copy — no preamble, no explanation.';

/**
 * Robustly parses structured copy JSON output or extracts key-value fallbacks.
 * @param {string} rawText
 * @returns {{ headline: string, body: string, callToAction: string, tone: string, keyTakeaways: string[] } | null}
 */
export function parseStructuredOutput(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      return {
        headline: String(parsed.headline || 'Generated Copy'),
        body: String(parsed.body || rawText),
        callToAction: parsed.callToAction ? String(parsed.callToAction) : 'Learn More',
        tone: parsed.tone ? String(parsed.tone) : 'Persuasive',
        keyTakeaways: Array.isArray(parsed.keyTakeaways)
          ? parsed.keyTakeaways.map(String)
          : [],
      };
    }
  } catch {
    const headlineMatch = rawText.match(/headline:\s*([^\n]+)/i);
    const bodyMatch = rawText.match(/body:\s*([^\n]+)/i);
    const ctaMatch = rawText.match(/(?:callToAction|cta):\s*([^\n]+)/i);
    const toneMatch = rawText.match(/tone:\s*([^\n]+)/i);
    if (headlineMatch || bodyMatch) {
      return {
        headline: headlineMatch ? headlineMatch[1].trim() : 'Generated Copy',
        body: bodyMatch ? bodyMatch[1].trim() : rawText.trim(),
        callToAction: ctaMatch ? ctaMatch[1].trim() : 'Get Started',
        tone: toneMatch ? toneMatch[1].trim() : 'Engaging',
        keyTakeaways: [],
      };
    }
  }
  return null;
}

/**
 * Call Google Gemini API (100% free at https://aistudio.google.com/app/apikey)
 * @param {string} apiKey
 * @param {string} prompt
 * @param {'structured' | 'plain'} format
 * @returns {Promise<string>}
 */
async function callGemini(apiKey, prompt, format = 'structured') {
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const systemInstruction =
    format === 'plain' ? PLAIN_SYSTEM_INSTRUCTION : STRUCTURED_SYSTEM_INSTRUCTION;

  const config = {
    systemInstruction,
    maxOutputTokens: 384,
    ...(format === 'structured' ? { responseMimeType: 'application/json' } : {}),
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    return response.text?.trim() || 'No response generated.';
  } catch (err) {
    if (model !== 'gemini-3.8-flash' && (err?.status === 404 || err?.message?.toLowerCase().includes('not found'))) {
      console.warn('Falling back to gemini-3.8-flash');
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config,
      });
      return fallbackResponse.text?.trim() || 'No response generated.';
    }
    throw err;
  }
}

/**
 * Call Anthropic Claude API (requires paid credit at console.anthropic.com)
 * @param {string} apiKey
 * @param {string} prompt
 * @param {'structured' | 'plain'} format
 * @returns {Promise<string>}
 */
async function callAnthropic(apiKey, prompt, format = 'structured') {
  const client = new Anthropic({ apiKey });
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
  const systemInstruction =
    format === 'plain' ? PLAIN_SYSTEM_INSTRUCTION : STRUCTURED_SYSTEM_INSTRUCTION;

  let message;
  try {
    message = await client.messages.create({
      model: modelName,
      max_tokens: 384,
      system: systemInstruction,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
  } catch (primaryErr) {
    if (primaryErr?.status === 404 && modelName !== 'claude-3-haiku-20240307') {
      message = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 384,
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: prompt,
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

async function streamGemini(apiKey, prompt, res, format = 'structured') {
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const systemInstruction =
    format === 'plain' ? PLAIN_SYSTEM_INSTRUCTION : STRUCTURED_SYSTEM_INSTRUCTION;

  const stream = await ai.models.generateContentStream({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      maxOutputTokens: 384,
      ...(format === 'structured' ? { responseMimeType: 'application/json' } : {}),
    },
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }
  }

  const structured = parseStructuredOutput(fullText);
  res.write(
    `data: ${JSON.stringify({
      done: true,
      title: structured?.headline || 'Generated output',
      body: structured?.body || fullText.trim() || 'No response generated.',
      structured,
    })}\n\n`,
  );
  res.end();
}

async function streamAnthropic(apiKey, prompt, res, format = 'structured') {
  const client = new Anthropic({ apiKey });
  const modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
  const systemInstruction =
    format === 'plain' ? PLAIN_SYSTEM_INSTRUCTION : STRUCTURED_SYSTEM_INSTRUCTION;

  const stream = await client.messages.stream({
    model: modelName,
    max_tokens: 384,
    system: systemInstruction,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  let fullText = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      fullText += event.delta.text;
      res.write(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`);
    }
  }

  const structured = parseStructuredOutput(fullText);
  res.write(
    `data: ${JSON.stringify({
      done: true,
      title: structured?.headline || 'Generated output',
      body: structured?.body || fullText.trim() || 'No response generated.',
      structured,
    })}\n\n`,
  );
  res.end();
}

/** @type {import('@vercel/node').VercelRequest} */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Development-Only Failure Simulation (FE-08) ────────────────────────────
  // Strictly disabled in production; never exposes internal secrets.
  const isDev = process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';
  const simulateError = isDev ? (req.body?.simulateError || req.headers['x-simulate-error']) : null;

  if (simulateError === 'rateLimit') {
    res.setHeader('Retry-After', '15');
    return res.status(429).json({
      error: 'Too many requests (simulated 429). Please wait before trying again.',
      retryAfter: 15,
    });
  }

  if (simulateError === 'midstream') {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    res.write(`data: ${JSON.stringify({ chunk: 'Starting draft announcement: ' })}\n\n`);
    res.write(`data: ${JSON.stringify({ chunk: 'Analyzing product positioning and tone... ' })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 600));
    res.write(
      `data: ${JSON.stringify({
        error: 'Simulated mid-stream failure: Stream disconnected during response generation.',
      })}\n\n`,
    );
    res.end();
    return;
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

  const { prompt, stream = false, format = 'structured' } = req.body ?? {};

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

  const wantsStream = stream || req.headers.accept?.includes('text/event-stream');

  if (wantsStream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    try {
      if (geminiKey) {
        await streamGemini(geminiKey, trimmedPrompt, res, format);
      } else {
        await streamAnthropic(anthropicKey, trimmedPrompt, res, format);
      }
      return;
    } catch (streamErr) {
      console.error('AI streaming error:', streamErr);
      const safeErrMessage =
        typeof streamErr?.message === 'string' &&
        !streamErr.message.includes('AIza') &&
        !streamErr.message.includes('sk-')
          ? streamErr.message
          : 'Streaming failed during response generation.';
      res.write(`data: ${JSON.stringify({ error: safeErrMessage })}\n\n`);
      res.end();
      return;
    }
  }

  try {
    let text;
    if (geminiKey) {
      text = await callGemini(geminiKey, trimmedPrompt, format);
    } else {
      text = await callAnthropic(anthropicKey, trimmedPrompt, format);
    }

    const structured = parseStructuredOutput(text);
    return res.status(200).json({
      title: structured?.headline || 'Generated output',
      body: structured?.body || text,
      structured,
    });
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
