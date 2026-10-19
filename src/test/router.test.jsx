import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Router, useRoute, Link } from '../router.jsx';

function RouteProbe() {
  const { path, navigate } = useRoute();
  return (
    <div>
      <span data-testid="current-path">{path}</span>
      <button onClick={() => navigate('/custom')}>Go to Custom</button>
      <Link to="/link-target">Click Link</Link>
    </div>
  );
}

describe('Router & Link components', () => {
  it('defaults to "/" when hash is empty or root', () => {
    window.location.hash = '';
    render(
      <Router>
        <RouteProbe />
      </Router>
    );

    expect(screen.getByTestId('current-path')).toHaveTextContent('/');
  });

  it('navigates via Link and hashchange event', () => {
    window.location.hash = '#/';
    render(
      <Router>
        <RouteProbe />
      </Router>
    );

    const link = screen.getByRole('link', { name: /Click Link/i });
    expect(link).toHaveAttribute('href', '#/link-target');

    act(() => {
      window.location.hash = '#/link-target';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByTestId('current-path')).toHaveTextContent('/link-target');
  });

  it('navigates via programmatic navigate function', () => {
    window.location.hash = '#/';
    render(
      <Router>
        <RouteProbe />
      </Router>
    );

    const btn = screen.getByRole('button', { name: /Go to Custom/i });
    fireEvent.click(btn);

    expect(window.location.hash).toBe('#/custom');
  });
});
