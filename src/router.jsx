import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext({
  path: '/',
  navigate: () => {},
});

function normalize(hash) {
  const raw = hash.replace(/^#/, '');
  if (!raw || raw === '/') {
    return '/';
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function Router({ children }) {
  const [path, setPath] = useState(() => normalize(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setPath(normalize(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const value = useMemo(
    () => ({
      path,
      navigate: (next) => {
        window.location.hash = next;
      },
    }),
    [path],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRoute() {
  return useContext(RouterContext);
}

export function Link({ to, children, className }) {
  return (
    <a className={className} href={`#${to}`}>
      {children}
    </a>
  );
}
