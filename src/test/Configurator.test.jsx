import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfiguratorPage, { COLORWAYS, FINISHES } from '../pages/ConfiguratorPage.jsx';
import ConfiguratorFallback from '../components/ConfiguratorFallback.jsx';
import ConfiguratorErrorBoundary from '../components/ConfiguratorErrorBoundary.jsx';

describe('ConfiguratorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product title, eyebrow, and specifications', () => {
    render(<ConfiguratorPage />);
    expect(screen.getByRole('heading', { level: 1, name: /AuraWave Studio Pro/i })).toBeInTheDocument();
    expect(screen.getByText(/40mm Titanium/i)).toBeInTheDocument();
    expect(screen.getByText(/-42dB Hybrid ANC/i)).toBeInTheDocument();
    expect(screen.getByText(/45h Playtime/i)).toBeInTheDocument();
  });

  it('renders all 4 colorways and allows selecting a colorway', () => {
    render(<ConfiguratorPage />);
    COLORWAYS.forEach((c) => {
      expect(screen.getByRole('radio', { name: new RegExp(c.name, 'i') })).toBeInTheDocument();
    });

    // Select Cosmic Cobalt
    const cobaltBtn = screen.getByRole('radio', { name: /Cosmic Cobalt/i });
    fireEvent.click(cobaltBtn);
    expect(cobaltBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('renders material finishes and updates selection', () => {
    render(<ConfiguratorPage />);
    FINISHES.forEach((f) => {
      expect(screen.getByRole('radio', { name: new RegExp(f.label, 'i') })).toBeInTheDocument();
    });

    const metallicBtn = screen.getByRole('radio', { name: /Anodized Metal/i });
    fireEvent.click(metallicBtn);
    expect(metallicBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles exploded driver architecture view', () => {
    render(<ConfiguratorPage />);
    const explodeBtn = screen.getByRole('button', { name: /Exploded Driver Architecture/i });
    expect(explodeBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(explodeBtn);
    expect(explodeBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(explodeBtn);
    expect(explodeBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('triggers soundwave acoustic pulse test and disables button while testing', async () => {
    render(<ConfiguratorPage />);
    const pulseBtn = screen.getByRole('button', { name: /Trigger Soundwave Audio Test/i });
    fireEvent.click(pulseBtn);

    expect(pulseBtn).toBeDisabled();
    expect(screen.getByText(/Testing Acoustic Drivers.../i)).toBeInTheDocument();
  });

  it('toggles reduced motion preference', () => {
    render(<ConfiguratorPage />);
    const motionToggle = screen.getByLabelText(/Toggle reduced motion preference override/i);
    expect(motionToggle).not.toBeChecked();

    fireEvent.click(motionToggle);
    expect(motionToggle).toBeChecked();
  });

  it('adds product to bag and shows interactive confirmation', async () => {
    render(<ConfiguratorPage />);
    const orderBtn = screen.getByRole('button', { name: /Configure & Pre-order/i });
    fireEvent.click(orderBtn);

    expect(screen.getByText(/✓ Added to Bag/i)).toBeInTheDocument();
  });

  it('gracefully renders static 2.5D visual fallback when WebGL is unavailable', () => {
    render(<ConfiguratorPage />);
    // In jsdom without WebGL, the fallback badge is displayed
    expect(screen.getByText(/WebGL Visual Fallback/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Headphone 2.5D visual preview fallback/i)).toBeInTheDocument();
  });
});

describe('ConfiguratorErrorBoundary & ConfiguratorFallback', () => {
  it('renders fallback when error boundary catches a rendering error', () => {
    const ProblemChild = () => {
      throw new Error('WebGL context was lost simulated error');
    };

    // Suppress console.error for expected thrown error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ConfiguratorErrorBoundary colorway={COLORWAYS[0]} finish="matte" exploded={false}>
        <ProblemChild />
      </ConfiguratorErrorBoundary>
    );

    expect(screen.getByText(/Renderer Error Fallback/i)).toBeInTheDocument();
    expect(screen.getByText(/WebGL context was lost simulated error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry 3D Canvas/i })).toBeInTheDocument();

    spy.mockRestore();
  });

  it('ConfiguratorFallback displays active colorway and finish shine', () => {
    render(
      <ConfiguratorFallback
        colorway={COLORWAYS[2]}
        finish="gloss"
        isError={false}
      />
    );
    expect(screen.getByLabelText(new RegExp(`2D graphic preview of headphones in ${COLORWAYS[2].name}`, 'i'))).toBeInTheDocument();
  });
});
