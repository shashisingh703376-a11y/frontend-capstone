import React, { useState, useEffect, lazy, Suspense } from 'react';
import ConfiguratorErrorBoundary from '../components/ConfiguratorErrorBoundary.jsx';
import ConfiguratorFallback from '../components/ConfiguratorFallback.jsx';
import './ConfiguratorPage.css';

// Lazy-load the heavy 3D Canvas bundle for performance and chunk splitting
const ConfiguratorCanvas = lazy(() => import('../components/ConfiguratorCanvas.jsx'));

export const COLORWAYS = [
  {
    id: 'obsidian',
    name: 'Midnight Obsidian',
    tag: 'Classic',
    body: '#18191c',
    accent: '#6366f1',
    cushion: '#252830',
  },
  {
    id: 'silver',
    name: 'Platinum Silver',
    tag: 'Modern',
    body: '#caced6',
    accent: '#cbd5e1',
    cushion: '#475569',
  },
  {
    id: 'cobalt',
    name: 'Cosmic Cobalt',
    tag: 'Vibrant',
    body: '#0f172a',
    accent: '#38bdf8',
    cushion: '#1e293b',
  },
  {
    id: 'bronze',
    name: 'Sunset Bronze',
    tag: 'Warm Luxe',
    body: '#582a17',
    accent: '#f59e0b',
    cushion: '#3b1807',
  },
];

export const FINISHES = [
  { id: 'matte', label: 'Satin Matte' },
  { id: 'metallic', label: 'Anodized Metal' },
  { id: 'gloss', label: 'High Gloss' },
];

export const CAMERA_PRESETS = [
  { id: 'perspective', label: '3/4 Angle' },
  { id: 'side', label: 'Side Profile' },
  { id: 'front', label: 'Front View' },
  { id: 'top', label: 'Top Down' },
];

function checkWebGLSupport() {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export default function ConfiguratorPage() {
  const [colorway, setColorway] = useState(COLORWAYS[0]);
  const [finish, setFinish] = useState('matte');
  const [exploded, setExploded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [cameraPreset, setCameraPreset] = useState('perspective');
  const [autoRotate, setAutoRotate] = useState(true);
  const [orderAdded, setOrderAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [hasWebGL, setHasWebGL] = useState(true);

  // System reduced-motion preference detection
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleChange = (e) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Sync autoRotate off if reducedMotion is enabled
  useEffect(() => {
    if (reducedMotion) {
      setAutoRotate(false);
    }
  }, [reducedMotion]);

  // Color selection handler
  const handleColorSelect = (item) => {
    setColorway(item);
    setLiveMessage(`Selected colorway: ${item.name}.`);
  };

  // Finish selection handler
  const handleFinishSelect = (f) => {
    setFinish(f.id);
    setLiveMessage(`Selected material finish: ${f.label}.`);
  };

  // Exploded view animation toggle
  const toggleExploded = () => {
    setExploded((prev) => {
      const next = !prev;
      setLiveMessage(next ? 'Exploded architecture view activated.' : 'Standard assembly view restored.');
      return next;
    });
  };

  // User-triggered acoustic pulse animation
  const triggerAudioTest = () => {
    if (isPulsing) return;
    setIsPulsing(true);
    setLiveMessage('Soundwave acoustic pulse test started.');
    setTimeout(() => {
      setIsPulsing(false);
      setLiveMessage('Acoustic pulse test complete.');
    }, 3800);
  };

  // Camera preset handler
  const handleCameraChange = (presetId) => {
    setCameraPreset(presetId);
    setLiveMessage(`Camera moved to ${presetId} view.`);
  };

  // Add to bag feedback
  const handleAddToBag = () => {
    setOrderAdded(true);
    setLiveMessage(`Added ${colorway.name} AuraWave Studio Pro with ${finish} finish to bag.`);
    setTimeout(() => setOrderAdded(false), 3000);
  };

  return (
    <section className="configurator-page" aria-labelledby="configurator-heading">
      <header className="configurator-header">
        <p className="configurator-eyebrow">Week 7 · Interactive 3D Experience</p>
        <h1 id="configurator-heading" className="configurator-title">
          AuraWave Studio Pro
        </h1>
        <p className="configurator-subtitle">
          Real-time interactive 3D product customizer built with React Three Fiber.
          Inspect procedural geometry, customize materials, explore exploded architecture, and test spatial acoustics.
        </p>
      </header>

      {/* Screen reader live updates */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </div>

      <div className="configurator-grid">
        {/* Left Column: 3D Viewport Stage */}
        <div className="viewport-stage">
          <div className="viewport-topbar">
            <span className="viewport-badge">
              <span className="viewport-badge__pulse" aria-hidden="true"></span>
              <span>Interactive 3D Engine</span>
            </span>

            <span className="viewport-badge">
              <span>{colorway.name}</span>
            </span>
          </div>

          {/* Render 3D canvas if WebGL available, else render static 2.5D visual fallback */}
          {!hasWebGL ? (
            <ConfiguratorFallback colorway={colorway} finish={finish} exploded={exploded} />
          ) : (
            <ConfiguratorErrorBoundary colorway={colorway} finish={finish} exploded={exploded}>
              <Suspense
                fallback={
                  <div className="canvas-loading" role="status" aria-label="Loading 3D Engine">
                    <div className="loading-spinner"></div>
                    <p>Loading 3D Studio...</p>
                  </div>
                }
              >
                <ConfiguratorCanvas
                  colorway={colorway}
                  finish={finish}
                  exploded={exploded}
                  isPulsing={isPulsing}
                  autoRotate={autoRotate}
                  rotationSpeed={0.8}
                  reducedMotion={reducedMotion}
                  cameraPreset={cameraPreset}
                />
              </Suspense>
            </ConfiguratorErrorBoundary>
          )}

          {/* Camera View Presets */}
          <div className="viewport-cam-presets" role="group" aria-label="Camera angle presets">
            {CAMERA_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`cam-btn ${cameraPreset === p.id ? 'is-active' : ''}`}
                onClick={() => handleCameraChange(p.id)}
                aria-pressed={cameraPreset === p.id}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive Configuration Panel */}
        <aside className="configurator-panel" aria-label="Headphone customization controls">
          {/* Colorway Selection */}
          <div className="panel-section">
            <div className="section-label">
              <span>Colorway</span>
              <span className="section-value">{colorway.name}</span>
            </div>
            <div className="colorway-options" role="radiogroup" aria-label="Choose colorway">
              {COLORWAYS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={colorway.id === item.id}
                  className={`swatch-btn ${colorway.id === item.id ? 'is-active' : ''}`}
                  onClick={() => handleColorSelect(item)}
                >
                  <span
                    className="swatch-preview"
                    style={{
                      background: `linear-gradient(135deg, ${item.body} 0%, ${item.accent} 100%)`,
                    }}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Material Finish Selection */}
          <div className="panel-section">
            <div className="section-label">
              <span>Material Finish</span>
              <span className="section-value">
                {FINISHES.find((f) => f.id === finish)?.label}
              </span>
            </div>
            <div className="finish-options" role="radiogroup" aria-label="Choose surface finish">
              {FINISHES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={finish === f.id}
                  className={`finish-btn ${finish === f.id ? 'is-active' : ''}`}
                  onClick={() => handleFinishSelect(f)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* User-Triggered Animations & Interactions */}
          <div className="panel-section">
            <p className="section-label">Interactive Actions</p>
            <div className="actions-cluster">
              <button
                type="button"
                className={`action-trigger-btn ${exploded ? 'is-active' : ''}`}
                onClick={toggleExploded}
                aria-pressed={exploded}
              >
                <span>Exploded Driver Architecture</span>
                <span className="action-status-tag">{exploded ? 'Active' : 'Assembled'}</span>
              </button>

              <button
                type="button"
                className={`audio-pulse-btn ${isPulsing ? 'is-pulsing' : ''}`}
                onClick={triggerAudioTest}
                disabled={isPulsing}
                aria-live="polite"
              >
                <span aria-hidden="true">{isPulsing ? '🔊' : '▶'}</span>
                <span>{isPulsing ? 'Testing Acoustic Drivers...' : 'Trigger Soundwave Audio Test'}</span>
              </button>
            </div>
          </div>

          {/* Motion & Rotation Preferences */}
          <div className="panel-section">
            <div className="preference-row">
              <div className="preference-info">
                <span className="preference-title">Continuous Auto-Rotate</span>
                <span className="preference-sub">Gently orbit 3D model automatically</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoRotate && !reducedMotion}
                  disabled={reducedMotion}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  aria-label="Toggle auto-rotation"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-row">
              <div className="preference-info">
                <span className="preference-title">Respect Reduced Motion</span>
                <span className="preference-sub">Disable continuous pulses and spin</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  aria-label="Toggle reduced motion preference override"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Specifications Panel */}
          <div className="product-specs">
            <p className="section-label">Acoustic Specifications</p>
            <div className="specs-grid">
              <div className="spec-item">
                <p className="spec-name">Transducers</p>
                <p className="spec-val">40mm Titanium</p>
              </div>
              <div className="spec-item">
                <p className="spec-name">Noise Canceling</p>
                <p className="spec-val">-42dB Hybrid ANC</p>
              </div>
              <div className="spec-item">
                <p className="spec-name">Battery Life</p>
                <p className="spec-val">45h Playtime</p>
              </div>
              <div className="spec-item">
                <p className="spec-name">Spatial Audio</p>
                <p className="spec-val">Dynamic Head Tracking</p>
              </div>
            </div>
          </div>

          {/* Pricing and Action Button */}
          <div className="order-section">
            <div className="price-wrap">
              <p className="price-label">Price</p>
              <p className="price-val">$349</p>
            </div>
            <button
              type="button"
              className="order-btn"
              onClick={handleAddToBag}
            >
              {orderAdded ? '✓ Added to Bag' : 'Configure & Pre-order'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
