import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteErrorBoundary from '../components/RouteErrorBoundary.jsx';

function BrokenComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Exploded during rendering');
  }
  return <div>Component rendered successfully</div>;
}

describe('RouteErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <RouteErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </RouteErrorBoundary>
    );
    expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
  });

  it('catches render error, renders accessible alert, and recovers on "Try again"', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <RouteErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/exploded during rendering/i)).toBeInTheDocument();

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    // Rerender with working child and click Try again
    rerender(
      <RouteErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </RouteErrorBoundary>
    );

    fireEvent.click(tryAgainBtn);
    expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('provides a "Back to Home" navigation button on route error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RouteErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </RouteErrorBoundary>
    );

    const homeBtn = screen.getByRole('button', { name: /back to home/i });
    expect(homeBtn).toBeInTheDocument();
    fireEvent.click(homeBtn);
    expect(window.location.hash).toBe('#/');

    spy.mockRestore();
  });
});
