import { useEffect, useRef, useState } from 'react';
import GenerateButton from '../components/GenerateButton.jsx';
import { fakeGenerate, validatePrompt } from '../lib/fakeGenerate.js';
import './ActionStudio.css';

const MAX_PROMPT_LENGTH = 1000;

export const EXAMPLE_PROMPTS = [
  {
    icon: '🚀',
    label: 'Product Launch',
    prompt: 'Write an exciting launch announcement for our new AI-powered note-taking tool.',
  },
  {
    icon: '✉️',
    label: 'Outreach Email',
    prompt: 'Draft a friendly, compelling cold outreach email to invite a design director for coffee.',
  },
  {
    icon: '🎯',
    label: 'Hero Tagline',
    prompt: 'Generate a high-converting headline, subheadline, and CTA for a developer portfolio.',
  },
  {
    icon: '✨',
    label: 'Feature Pitch',
    prompt: 'Highlight 3 key differentiators of our collaborative code editor in a concise tweet.',
  },
];

const STATE_HELP = {
  idle: 'Ready. Hover, focus, or press to preview micro-interactions.',
  loading: 'Request in flight. Extra clicks are ignored until it settles.',
  success: 'The request resolved. The checkmark holds, then returns to idle.',
  error: 'The request failed. Review the error details and click Retry.',
  disabled: 'The control is unavailable and does not accept pointer or keyboard activation.',
};

export default function ActionStudio() {
  const [buttonState, setButtonState] = useState('idle');
  const [forceDisabled, setForceDisabled] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastMode, setLastMode] = useState('random');
  const [prompt, setPrompt] = useState('Write a launch announcement for a focused writing app.');
  const [promptError, setPromptError] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  const inFlight = useRef(false);
  const requestId = useRef(0);
  const resetTimer = useRef(0);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);
  const resultRef = useRef(null);
  const lastFailedPromptRef = useRef('');

  useEffect(() => {
    return () => {
      window.clearTimeout(resetTimer.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (forceDisabled && !inFlight.current) {
      setButtonState('disabled');
    } else if (!forceDisabled && buttonState === 'disabled') {
      setButtonState('idle');
    }
  }, [forceDisabled, buttonState]);

  useEffect(() => {
    if ((result || errorMessage) && typeof resultRef.current?.scrollIntoView === 'function') {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [result, errorMessage]);


  function clearReset() {
    window.clearTimeout(resetTimer.current);
  }

  function handleSelectExample(examplePrompt) {
    setPrompt(examplePrompt);
    setPromptError('');
    textareaRef.current?.focus();
  }

  function handleStop() {
    if (inFlight.current && abortControllerRef.current) {
      abortControllerRef.current.abort();
      inFlight.current = false;
      setButtonState('idle');
      setStreamingText('');
      setErrorMessage('');
      setResult({
        title: 'Cancelled',
        body: 'Generation stopped by user.',
      });
    }
  }

  async function runGenerate(mode = 'random', promptOverride = null) {
    if (inFlight.current || forceDisabled) {
      return;
    }

    const currentPrompt = (promptOverride ?? prompt).trim();

    // Client-side validation for all modes that use user input
    if (mode === 'random') {
      const validationErr = validatePrompt(currentPrompt);
      if (validationErr) {
        setPromptError(validationErr);
        return;
      }
      setPromptError('');
    }

    inFlight.current = true;
    lastFailedPromptRef.current = currentPrompt;
    const id = ++requestId.current;
    clearReset();
    setLastMode(mode);
    setResult(null);
    setErrorMessage('');
    setStreamingText('');
    setButtonState('loading');

    // Create fresh AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const payload = await fakeGenerate({
        outcome: mode,
        prompt: currentPrompt,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          if (id === requestId.current) {
            setStreamingText(chunk);
          }
        },
      });

      if (id !== requestId.current) {
        return;
      }

      setResult(payload);
      setStreamingText('');
      setButtonState('success');

      resetTimer.current = window.setTimeout(() => {
        if (requestId.current !== id) {
          return;
        }
        setButtonState(forceDisabled ? 'disabled' : 'idle');
      }, 2400);
    } catch (error) {
      if (id !== requestId.current) {
        return;
      }

      if (error?.name === 'AbortError') {
        setButtonState('idle');
        return;
      }

      setStreamingText('');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while generating.',
      );
      setButtonState('error');
    } finally {
      if (id === requestId.current) {
        inFlight.current = false;
        abortControllerRef.current = null;
      }
    }
  }

  async function handleRetry() {
    if (inFlight.current || isRetrying) {
      return;
    }
    setIsRetrying(true);
    try {
      await runGenerate(lastMode, lastFailedPromptRef.current);
    } finally {
      setIsRetrying(false);
    }
  }

  const busy = buttonState === 'loading';
  const visualState = forceDisabled && !busy ? 'disabled' : buttonState;
  const isPromptEmpty = !prompt.trim();

  return (
    <section className="studio" aria-labelledby="studio-title">
      <header className="studio__intro">
        <p className="eyebrow">FE-AA1 · Week 6 & FE-08</p>
        <h1 id="studio-title">AI Action Studio</h1>
        <p className="lede">
          A production-grade AI copywriting studio featuring resilient error boundaries,
          mid-stream error recovery, zero-layout-shift skeleton loading, and accessible state
          transitions.
        </p>
      </header>

      <div className="studio__layout">
        <article className="panel">
          <div className="panel__top">
            <h2>Prompt canvas</h2>
            <span className={`state-pill state-pill--${visualState}`} aria-live="polite">
              {visualState}
            </span>
          </div>

          <label className="field">
            <span>
              Prompt
              <span className={`char-count${prompt.length > MAX_PROMPT_LENGTH ? ' char-count--over' : ''}`}>
                {prompt.length}/{MAX_PROMPT_LENGTH}
              </span>
            </span>
            <textarea
              ref={textareaRef}
              rows={4}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (promptError) setPromptError('');
              }}
              placeholder="Enter your prompt here, or choose an example below..."
              aria-describedby={promptError ? 'prompt-error' : undefined}
              aria-invalid={!!promptError}
              disabled={busy}
            />
            {promptError && (
              <span id="prompt-error" className="field-error" role="alert">
                {promptError}
              </span>
            )}
          </label>

          {/* First-Run Empty State: Clickable example prompt chips */}
          {isPromptEmpty && (
            <div className="empty-state" aria-label="Suggested starter prompts">
              <p className="empty-state__title">Need inspiration? Choose a starter prompt:</p>
              <div className="example-chips" role="group" aria-label="Example prompts">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    className="example-chip"
                    onClick={() => handleSelectExample(ex.prompt)}
                  >
                    <span aria-hidden="true">{ex.icon}</span>
                    <span>{ex.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="actions">
            <GenerateButton
              state={visualState}
              onClick={() => {
                void runGenerate('random');
              }}
            />

            {busy && (
              <button
                type="button"
                className="stop-btn"
                onClick={handleStop}
                aria-label="Stop generation request"
              >
                <span className="stop-icon" aria-hidden="true">■</span>
                Stop
              </button>
            )}

            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                void runGenerate('success');
              }}
              disabled={busy || forceDisabled}
            >
              Simulate Success
            </button>
            <button
              type="button"
              className="ghost-btn ghost-btn--warn"
              onClick={() => {
                void runGenerate('failure');
              }}
              disabled={busy || forceDisabled}
            >
              Simulate Failure
            </button>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={forceDisabled}
              onChange={(event) => setForceDisabled(event.target.checked)}
              disabled={busy}
            />
            Force disabled state
          </label>

          <p className="hint">{STATE_HELP[visualState]}</p>

          {/* Polite live region: Skeleton loading & Result output */}
          <div
            ref={resultRef}
            className="status-region"
            aria-live="polite"
            aria-atomic="true"
          >
            {busy ? (
              <div
                className="skeleton-card"
                role="status"
                aria-label="Generating response"
                aria-busy="true"
              >
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line" />
                <div className="skeleton-line" style={{ width: '92%' }} />
                <div className="skeleton-line" style={{ width: '65%' }} />
                {streamingText && (
                  <div className="streaming-preview">
                    <span>{streamingText}</span>
                    <span className="streaming-cursor" aria-hidden="true">▍</span>
                  </div>
                )}
              </div>
            ) : null}

            {result && !busy ? (
              result.body ? (
                <div className={`status ${result.title === 'Cancelled' ? 'status--empty' : 'status--success'}`}>
                  <strong>{result.title}</strong>
                  <p style={{ margin: '0.4rem 0 0' }}>{result.body}</p>
                </div>
              ) : (
                <div className="status status--empty" role="status">
                  <p>No results were returned by the AI. Try refining your prompt.</p>
                </div>
              )
            ) : null}
          </div>

          {/* Assertive region: error card with de-duplicated retry action */}
          {errorMessage && visualState === 'error' ? (
            <div className="error-card" role="alert" aria-live="assertive">
              <p>
                <strong>Error:</strong> {errorMessage}
              </p>
              <button
                type="button"
                className="retry-btn"
                onClick={() => {
                  void handleRetry();
                }}
                disabled={isRetrying || busy}
                aria-busy={isRetrying || undefined}
              >
                {isRetrying ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          ) : null}

          {/* Development-Only Edge Case Simulation Panel */}
          {import.meta.env.DEV && (
            <details className="dev-controls">
              <summary>FE-08 Dev Edge Case Simulator</summary>
              <div className="dev-controls__actions">
                <button
                  type="button"
                  className="dev-btn"
                  onClick={() => void runGenerate('midstream')}
                  disabled={busy}
                  title="Simulate mid-stream failure after initial chunks"
                >
                  Test Mid-stream Failure
                </button>
                <button
                  type="button"
                  className="dev-btn"
                  onClick={() => void runGenerate('rateLimit')}
                  disabled={busy}
                  title="Simulate HTTP 429 Rate Limit"
                >
                  Test 429 Rate Limit
                </button>
                <button
                  type="button"
                  className="dev-btn"
                  onClick={() => void runGenerate('failure')}
                  disabled={busy}
                  title="Simulate upstream/network failure"
                >
                  Test Network Failure
                </button>
              </div>
            </details>
          )}
        </article>

        <aside className="panel panel--meta">
          <h2>How it behaves (FE-08)</h2>
          <ul>
            <li><strong>Empty states:</strong> Clear prompt shows quick-start inspiration chips.</li>
            <li><strong>Whitespace protection:</strong> Empty or whitespace input is safely validated without dispatching network calls.</li>
            <li><strong>Skeleton loading:</strong> Animated shimmer cards mirror actual content to eliminate layout shift.</li>
            <li><strong>Mid-stream failure:</strong> Captures interruptions mid-stream and offers accessible retry.</li>
            <li><strong>De-duplicated retry:</strong> Retry button is debounced to block duplicate concurrent requests.</li>
            <li><strong>Stop control:</strong> In-flight requests can be cancelled cleanly via AbortController.</li>
            <li><strong>Mobile-ready:</strong> Text wraps safely with responsive overflow controls.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
