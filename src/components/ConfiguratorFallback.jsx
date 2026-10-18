import React from 'react';

export default function ConfiguratorFallback({
  colorway = { name: 'Midnight Obsidian', body: '#18191c', accent: '#6366f1', cushion: '#252830' },
  finish = 'matte',
  isError = false,
  errorMessage = '',
  onRetry = null,
}) {
  const finishShine = finish === 'gloss' ? 0.9 : finish === 'metallic' ? 0.6 : 0.2;

  return (
    <div
      className="configurator-fallback"
      role="region"
      aria-label="Headphone 2.5D visual preview fallback"
    >
      <div className="fallback-badge">
        <span className="fallback-badge__dot" aria-hidden="true"></span>
        <span>{isError ? 'Renderer Error Fallback' : 'WebGL Visual Fallback'}</span>
      </div>

      <div className="fallback-visual">
        <svg
          viewBox="0 0 320 280"
          className="fallback-svg"
          aria-label={`2D graphic preview of headphones in ${colorway.name}`}
        >
          <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorway.body} stopOpacity="1" />
              <stop offset="50%" stopColor={colorway.accent} stopOpacity={finishShine} />
              <stop offset="100%" stopColor={colorway.body} stopOpacity="1" />
            </linearGradient>
            <linearGradient id="cushionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorway.cushion} />
              <stop offset="100%" stopColor="#111317" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Headband arch */}
          <path
            d="M 60 160 C 60 50, 260 50, 260 160"
            fill="none"
            stroke="url(#bodyGrad)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          {/* Inner comfort cushion */}
          <path
            d="M 85 140 C 95 75, 225 75, 235 140"
            fill="none"
            stroke={colorway.cushion}
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Left Gimbal / Hinge */}
          <rect x="52" y="145" width="16" height="25" rx="4" fill={colorway.accent} />
          {/* Right Gimbal / Hinge */}
          <rect x="252" y="145" width="16" height="25" rx="4" fill={colorway.accent} />

          {/* Left Earcup */}
          <g transform="translate(60, 195) rotate(-6)">
            {/* Cushion */}
            <ellipse cx="-4" cy="0" rx="14" ry="46" fill="url(#cushionGrad)" />
            {/* Outer Shell */}
            <rect x="4" y="-42" width="22" height="84" rx="10" fill={colorway.body} stroke={colorway.accent} strokeWidth="2" />
            {/* Accent Ring */}
            <ellipse cx="14" cy="0" rx="4" ry="24" fill="none" stroke={colorway.accent} strokeWidth="3" />
          </g>

          {/* Right Earcup */}
          <g transform="translate(260, 195) rotate(6)">
            {/* Outer Shell */}
            <rect x="-26" y="-42" width="22" height="84" rx="10" fill={colorway.body} stroke={colorway.accent} strokeWidth="2" />
            {/* Accent Ring */}
            <ellipse cx="-14" cy="0" rx="4" ry="24" fill="none" stroke={colorway.accent} strokeWidth="3" />
            {/* Cushion */}
            <ellipse cx="4" cy="0" rx="14" ry="46" fill="url(#cushionGrad)" />
            {/* Power LED */}
            <circle cx="-15" cy="20" r="2.5" fill="#10b981" filter="url(#glow)" />
          </g>

          {/* Base shadow ellipse */}
          <ellipse cx="160" cy="255" rx="90" ry="12" fill="rgba(0,0,0,0.4)" />
        </svg>
      </div>

      <div className="fallback-info">
        <p className="fallback-title">
          {isError ? 'Unable to render 3D scene' : 'WebGL acceleration unavailable'}
        </p>
        <p className="fallback-desc">
          {isError
            ? (errorMessage || 'A graphics pipeline error occurred.')
            : 'Displaying 2.5D high-fidelity SVG preview. Color and material choices are fully functional.'}
        </p>
        {onRetry && (
          <button
            type="button"
            className="fallback-retry-btn"
            onClick={onRetry}
          >
            Retry 3D Canvas
          </button>
        )}
      </div>
    </div>
  );
}
