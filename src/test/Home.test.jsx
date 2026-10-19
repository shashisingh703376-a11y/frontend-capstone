import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../pages/Home.jsx';
import NotFound from '../pages/NotFound.jsx';
import { Router } from '../router.jsx';

describe('Home & NotFound Pages', () => {
  it('renders Home page title, lede, and assignment cards', () => {
    render(
      <Router>
        <Home />
      </Router>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Assignment studio/i })).toBeInTheDocument();
    expect(screen.getByText(/Buttons with a Brain/i)).toBeInTheDocument();
    expect(screen.getByText(/Interactive 3D Product Configurator/i)).toBeInTheDocument();
    expect(screen.getByText(/Deployment Health Check/i)).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('link', { name: /Open AI Action Studio/i })).toHaveAttribute('href', '#/action-studio');
    expect(screen.getByRole('link', { name: /Open 3D Configurator/i })).toHaveAttribute('href', '#/configurator');
    expect(screen.getByRole('link', { name: /Open Health Check/i })).toHaveAttribute('href', '#/health');
  });

  it('renders NotFound page when an unknown route is requested', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: /Page not found/i })).toBeInTheDocument();
    expect(screen.getByText(/That assignment route does not exist yet/i)).toBeInTheDocument();
  });
});
