import { Router, useRoute, Link } from './router.jsx';
import Home from './pages/Home.jsx';
import ActionStudio from './pages/ActionStudio.jsx';
import ConfiguratorPage from './pages/ConfiguratorPage.jsx';
import HealthCheck from './pages/HealthCheck.jsx';
import NotFound from './pages/NotFound.jsx';
import RouteErrorBoundary from './components/RouteErrorBoundary.jsx';
import './App.css';
import { Analytics } from '@vercel/analytics/react';

function DevCrashRoute() {
  throw new Error('Simulated route crash for verifying the Route Error Boundary.');
}

const routes = {
  '/': Home,
  '/action-studio': ActionStudio,
  '/configurator': ConfiguratorPage,
  '/health': HealthCheck,
  ...(import.meta.env.DEV ? { '/simulate-route-error': DevCrashRoute } : {}),
};

function Shell() {
  const { path } = useRoute();
  const Page = routes[path] ?? NotFound;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="brand">
          Frontend Capstone
        </Link>
        <nav aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/action-studio">AI Action Studio</Link>
          <Link to="/configurator">3D Configurator</Link>
          <Link to="/health">Health Check</Link>
          {import.meta.env.DEV && (
            <Link
              to="/simulate-route-error"
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                border: '1px dashed var(--error)',
                borderRadius: '6px',
                color: 'var(--error)',
              }}
              title="Dev-only: click to test Route Error Boundary"
            >
              Test Route Error
            </Link>
          )}
        </nav>
      </header>
      <main id="main">
        <RouteErrorBoundary key={path}>
          <Page />
        </RouteErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Shell />
      <Analytics />
    </Router>
  );
}
