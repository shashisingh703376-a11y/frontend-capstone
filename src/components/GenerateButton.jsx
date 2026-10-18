import './GenerateButton.css';

const LABELS = {
  idle: 'Generate',
  loading: 'Generating…',
  success: 'Generated',
  error: 'Failed — click to retry',
  disabled: 'Generate',
};

export default function GenerateButton({
  state = 'idle',
  onClick,
  type = 'button',
}) {
  // disabled: not clickable. loading/success: busy, not re-entrant.
  // error: clickable so the user can retry via the Generate path.
  const isDisabled = state === 'disabled' || state === 'loading' || state === 'success';
  const busy = state === 'loading';

  return (
    <button
      type={type}
      className={`generate-btn generate-btn--${state}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      aria-label={LABELS[state] ?? 'Generate'}
    >
      <span className="generate-btn__glow" aria-hidden="true" />
      <span className="generate-btn__stack">
        <span
          className={`generate-btn__layer${state === 'idle' || state === 'disabled' ? ' is-active' : ''}`}
          aria-hidden={state !== 'idle' && state !== 'disabled'}
        >
          <SparkIcon />
          Generate
        </span>
        <span
          className={`generate-btn__layer${state === 'loading' ? ' is-active' : ''}`}
          aria-hidden={state !== 'loading'}
        >
          <span className="spinner" aria-hidden="true" />
          Generating
        </span>
        <span
          className={`generate-btn__layer${state === 'success' ? ' is-active' : ''}`}
          aria-hidden={state !== 'success'}
        >
          <span className="checkmark" aria-hidden="true">
            <span className="checkmark__stem" />
            <span className="checkmark__kick" />
          </span>
          Generated
        </span>
        <span
          className={`generate-btn__layer${state === 'error' ? ' is-active' : ''}`}
          aria-hidden={state !== 'error'}
        >
          <span className="error-mark" aria-hidden="true" />
          Failed
        </span>
      </span>
    </button>
  );
}

function SparkIcon() {
  return (
    <svg className="spark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 1.2 8.9 6 13.8 8 8.9 10 8 14.8 7.1 10 2.2 8 7.1 6z"
      />
    </svg>
  );
}
