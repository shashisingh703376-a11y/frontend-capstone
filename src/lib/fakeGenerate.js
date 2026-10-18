const SUCCESS_MESSAGES = [
  'Drafted a concise product brief with three launch angles.',
  'Generated a warm outreach email and a shorter follow-up.',
  'Outlined a homepage hero with headline, proof, and CTA.',
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
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
 * Send a generation request to the server-side API route.
 * Falls back to the fake implementation when running locally without the
 * API route (e.g. plain `vite dev` without `vercel dev`).
 *
 * @param {{ outcome?: 'random' | 'success' | 'failure', prompt?: string }} options
 */
export async function fakeGenerate({ outcome = 'random', prompt = '' } = {}) {
  // ── Forced outcomes (demo / test buttons) stay as the local mock ──────────
  if (outcome === 'success') {
    await wait(randomDelay());
    return { title: 'Generated output', body: pick(SUCCESS_MESSAGES) };
  }

  if (outcome === 'failure') {
    await wait(randomDelay());
    const error = new Error(
      'Generation failed: the model timed out before returning a complete response.',
    );
    error.code = 'GENERATION_FAILED';
    throw error;
  }

  // ── Real API call ──────────────────────────────────────────────────────────
  const validationError = validatePrompt(prompt);
  if (validationError) {
    const error = new Error(validationError);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  let response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.trim() }),
    });
  } catch {
    // Network failure (offline, CORS, etc.)
    const error = new Error('Network error. Check your connection and try again.');
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  // Handle rate limiting
  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    const wait = data.retryAfter ? ` Please wait ${data.retryAfter}s.` : '';
    const error = new Error(`Too many requests.${wait}`);
    error.code = 'RATE_LIMITED';
    throw error;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(
      data.error || 'Generation failed. Please try again.',
    );
    error.code = 'GENERATION_FAILED';
    throw error;
  }

  const data = await response.json();
  return {
    title: data.title || 'Generated output',
    body: data.body || 'No response received.',
  };
}
