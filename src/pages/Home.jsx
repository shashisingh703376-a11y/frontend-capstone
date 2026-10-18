import { Link } from '../router.jsx';
import './Home.css';

export default function Home() {
  return (
    <section className="home">
      <p className="eyebrow">Frontend Capstone</p>
      <h1>Assignment studio</h1>
      <p className="lede">
        Each week lives on its own page so earlier work stays intact. Open Week 6
        to try the Generate button states and motion demo.
      </p>
      <article className="card">
        <p className="card__week">Week 6 · FE-AA1</p>
        <h2>Buttons with a Brain</h2>
        <p>
          Motion and state micro-interactions for an AI Action Studio Generate
          control, including loading, success, error, retry, and reduced motion.
        </p>
        <Link to="/action-studio" className="card__link">
          Open AI Action Studio
        </Link>
      </article>

      <article className="card">
        <p className="card__week">Week 7 · FE-AA2</p>
        <h2>Interactive 3D Product Configurator</h2>
        <p>
          A responsive 3D headphone studio built with React Three Fiber, procedural
          geometry, live material controls, exploded driver architecture, and WebGL fallbacks.
        </p>
        <Link to="/configurator" className="card__link">
          Open 3D Configurator
        </Link>
      </article>
    </section>
  );
}
