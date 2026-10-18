import { Router, useRoute, Link } from './router.jsx';
import Home from './pages/Home.jsx';
import ActionStudio from './pages/ActionStudio.jsx';
import NotFound from './pages/NotFound.jsx';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';

const routes = {
  '/': Home,
  '/action-studio': ActionStudio,
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
        </nav>
      </header>
      <main id="main">
        <Page />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Shell />
      <SpeedInsights />
    </Router>
  );
}
