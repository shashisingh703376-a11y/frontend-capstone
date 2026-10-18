import { useEffect, useRef, useState } from 'react';
import GenerateButton from '../components/GenerateButton.jsx';
import { fakeGenerate, validatePrompt } from '../lib/fakeGenerate.js';
import './ActionStudio.css';

const MAX_PROMPT_LENGTH = 1000;

const STATE_HELP = {
  idle: 'Ready. Hover, focus, or press to preview micro-interactions.',
  loading: 'Request in flight. Extra clicks are ignored until it settles.',
  success: 'The fake request resolved. The checkmark holds, then returns to idle.',
  error: 'The fake request failed. Use Retry or Generate again.',
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
  const inFlight = useRef(false);
  const requestId = useRef(0);
  const resetTimer = useRef(0);

  useEffect(() => {
    return () => {
      window.clearTimeout(resetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (forceDisabled && !inFlight.current) {
      setButtonState('disabled');
    } else if (!forceDisabled && buttonState === 'disabled') {
      setButtonState('idle');
    }
  }, [forceDisabled, buttonState]);

  function clearReset() {
    window.clearTimeout(resetTimer.current);
  }

  async function runGenerate(mode = 'random') {
    if (inFlight.current || forceDisabled) {
      return;
    }

    // Client-side validation only for real calls (not simulate buttons)
    if (mode === 'random') {
      const validationErr = validatePrompt(prompt);
      if (validationErr) {
        setPromptError(validationErr);
        return;
      }
      setPromptError('');
    }

    inFlight.current = true;
    const id = ++requestId.current;
    clearReset();
    setLastMode(mode);
    setResult(null);
    setErrorMessage('');
    setButtonState('loading');

    try {
      const payload = await fakeGenerate({ outcome: mode, prompt });
      if (id !== requestId.current) {
        return;
      }
      setResult(payload);
      setButtonState('success');
      resetTimer.current = window.setTimeout(() => {
        if (requestId.current !== id) {
          return;
        }
        setButtonState(forceDisabled ? 'disabled' : 'idle');
      }, 2200);
    } catch (error) {
      if (id !== requestId.current) {
        return;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while generating.',
      );
      setButtonState('error');
    } finally {
      if (id === requestId.current) {
        inFlight.current = false;
      }
    }
  }

  const busy = buttonState === 'loading';
  const visualState = forceDisabled && !busy ? 'disabled' : buttonState;

  return (
    <section className="studio" aria-labelledby="studio-title">
      <header className="studio__intro">
        <p className="eyebrow">FE-AA1 · Week 6</p>
        <h1 id="studio-title">AI Action Studio</h1>
        <p className="lede">
          Buttons with a brain: motion and state micro-interactions for a Generate
          action. Watch idle, hover, focus, press, loading, success, error, and
          disabled without overlapping requests.
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
              rows={4}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (promptError) setPromptError('');
              }}
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

          <div className="actions">
            <GenerateButton
              state={visualState}
              onClick={() => {
                void runGenerate('random');
              }}
            />
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

          {/* Polite region: loading and success copy */}
          <div className="status-region" aria-live="polite" aria-atomic="true">
            {busy ? <p className="status status--loading">Working on your request…</p> : null}
            {result && visualState === 'success' ? (
              <p className="status status--success">{result.body}</p>
            ) : null}
          </div>

          {/* Assertive region: error alert with retry — kept separate so it doesn't double-announce */}
          {errorMessage && visualState === 'error' ? (
            <div className="error-card" role="alert">
              <p>{errorMessage}</p>
              <button
                type="button"
                className="retry-btn"
                onClick={() => {
                  void runGenerate(lastMode);
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </article>

        <aside className="panel panel--meta">
          <h2>How it behaves</h2>
          <ul>
            <li>Normal Generate uses a random 0.9–2.0s delay and a 20% failure rate.</li>
            <li>Simulate Success / Failure reuse the same loading path with a forced outcome.</li>
            <li>In-flight clicks are ignored; the button stays busy until the request settles.</li>
            <li>Labels crossfade with opacity and transform so width never jumps.</li>
            <li>Reduced-motion users get instant state changes and a static spinner.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
