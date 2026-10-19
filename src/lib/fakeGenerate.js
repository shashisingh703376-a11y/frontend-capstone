export const SUCCESS_COPY_PACKAGES = [
  {
    title: 'Focus on What Truly Matters',
    body: 'Drafted a concise product brief with three launch angles designed to capture early adopter interest.',
    structured: {
      headline: 'Focus on What Truly Matters',
      body: 'Drafted a concise product brief with three launch angles designed to capture early adopter interest.',
      callToAction: 'Get Early Access',
      tone: 'Inspiring & Concise',
      keyTakeaways: [
        'Eliminates distraction with zero-clutter interface',
        'Instant keyboard-first navigation shortcuts',
        'Real-time collaborative syncing across devices',
      ],
    },
  },
  {
    title: 'Quick Coffee & Design Systems?',
    body: 'Generated a warm outreach email and a shorter follow-up crafted to connect with product leaders respectfully.',
    structured: {
      headline: 'Quick Coffee & Design Systems?',
      body: 'Generated a warm outreach email and a shorter follow-up crafted to connect with product leaders respectfully.',
      callToAction: 'Book 15 Minutes',
      tone: 'Warm & Professional',
      keyTakeaways: [
        'Personalized reference to their latest work',
        'Concise, zero-pressure invitation',
        'Clear, low-friction scheduling options',
      ],
    },
  },
  {
    title: 'Crafted for Developers Who Ship',
    body: 'Outlined a homepage hero with headline, social proof, and a conversion-focused call to action.',
    structured: {
      headline: 'Crafted for Developers Who Ship',
      body: 'Outlined a homepage hero with headline, social proof, and a conversion-focused call to action.',
      callToAction: 'Start Building Free',
      tone: 'Bold & Direct',
      keyTakeaways: [
        'Punchy value proposition in 5 words',
        'Trusted by over 10,000 developers',
        'Zero setup fee and open source core',
      ],
    },
  },
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Generation cancelled by user.', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Generation cancelled by user.', 'AbortError'));
    });
  });
}

export function randomDelay() {
  return 900 + Math.floor(Math.random() * 1100);
}

/**
 * Validates a prompt string before sending to the server.
 * Returns an error message string, or null if valid.
 * @param {string} prompt
 * @returns {string | null}
 */
export function validatePrompt(prompt) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return 'Prompt must not be empty.';
  }
  if (prompt.trim().length > 1000) {
    return 'Prompt must be 1,000 characters or fewer.';
  }
  return null;
}

/**
 * Send a generation request to the server-side API route with streaming support.
 * Supports forced outcomes, cancellation signals, progress chunk callbacks,
 * and dev-only error simulations.
 *
 * @param {{
 *   outcome?: 'random' | 'success' | 'failure' | 'midstream' | 'rateLimit',
 *   prompt?: string,
 *   format?: 'structured' | 'plain',
 *   onChunk?: (chunk: string) => void,
 *   signal?: AbortSignal,
 *   simulateError?: 'midstream' | 'rateLimit' | null
 * }} options
 */
export async function fakeGenerate({
  outcome = 'random',
  prompt = '',
  format = 'structured',
  onChunk,
  signal,
  simulateError = null,
} = {}) {
  // ── Forced outcomes (simulation & demo buttons) ───────────────────────────
  if (outcome === 'success') {
    const pkg = pick(SUCCESS_COPY_PACKAGES);
    const fullText = pkg.body;
    if (onChunk) {
      const parts = fullText.split(' ');
      let current = '';
      for (const word of parts) {
        await wait(60, signal);
        current += (current ? ' ' : '') + word;
        onChunk(current);
      }
    } else {
      await wait(randomDelay(), signal);
    }
    return {
      title: pkg.title,
      body: pkg.body,
      structured: pkg.structured,
    };
  }

  if (outcome === 'failure') {
    await wait(randomDelay(), signal);
    const error = new Error(
      'Generation failed: the model timed out before returning a complete response.',
    );
    error.code = 'GENERATION_FAILED';
    throw error;
  }

  if (outcome === 'midstream') {
    // Simulate streaming the first few words then breaking
    const partial = 'Drafting product announcement: Analyzing launch positioning...';
    if (onChunk) {
      onChunk(partial);
    }
    await wait(500, signal);
    const error = new Error(
      'Simulated mid-stream failure: Stream disconnected during response generation.',
    );
    error.code = 'STREAM_ERROR';
    throw error;
  }

  if (outcome === 'rateLimit') {
    await wait(200, signal);
    const error = new Error('Too many requests (HTTP 429). Please wait 15s before trying again.');
    error.code = 'RATE_LIMITED';
    error.retryAfter = 15;
    throw error;
  }

  // ── Real API call ──────────────────────────────────────────────────────────
  const validationError = validatePrompt(prompt);
  if (validationError) {
    const error = new Error(validationError);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (signal?.aborted) {
    throw new DOMException('Generation cancelled by user.', 'AbortError');
  }

  let response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        stream: true,
        format,
        ...(simulateError ? { simulateError } : {}),
      }),
      signal,
    });
  } catch (fetchErr) {
    if (fetchErr?.name === 'AbortError') {
      throw fetchErr;
    }
    // Network failure (offline, DNS failure, connection refused)
    const error = new Error('Network error. Check your internet connection and try again.');
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  // Handle rate limiting (429)
  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    const waitSec = data.retryAfter || response.headers.get('Retry-After') || 15;
    const error = new Error(`Too many requests. Please wait ${waitSec}s before retrying.`);
    error.code = 'RATE_LIMITED';
    error.retryAfter = Number(waitSec);
    throw error;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message || data.message || 'Generation failed. Please try again.';
    const error = new Error(message);
    error.code = 'GENERATION_FAILED';
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';

  // Handle SSE streaming response
  if (contentType.includes('text/event-stream') && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const payload = JSON.parse(trimmed.slice(6));
              if (payload.error) {
                const streamErr = new Error(payload.error);
                streamErr.code = 'STREAM_ERROR';
                throw streamErr;
              }
              if (payload.chunk) {
                accumulatedText += payload.chunk;
                onChunk?.(accumulatedText);
              }
              if (payload.done) {
                return {
                  title: payload.title || 'Generated output',
                  body: payload.body || accumulatedText.trim(),
                  structured: payload.structured || null,
                };
              }
            } catch (parseErr) {
              if (parseErr.code === 'STREAM_ERROR') {
                throw parseErr;
              }
              // Ignore non-json ping/comment lines
            }
          }
        }
      }
    } catch (readErr) {
      if (readErr?.name === 'AbortError') {
        throw readErr;
      }
      if (readErr?.code === 'STREAM_ERROR') {
        throw readErr;
      }
      const streamErr = new Error(
        'Stream interrupted mid-generation. Check connection and retry.',
      );
      streamErr.code = 'STREAM_ERROR';
      throw streamErr;
    }

    return {
      title: 'Generated output',
      body: accumulatedText.trim() || 'No response received.',
      structured: null,
    };
  }

  // Handle standard JSON fallback
  const data = await response.json();
  return {
    title: data.title || 'Generated output',
    body: data.body || 'No response received.',
    structured: data.structured || null,
  };
}
