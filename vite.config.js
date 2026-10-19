import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevPlugin() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/health')) {
          try {
            const { default: handler } = await import('./api/health.js');
            const url = new URL(req.url, 'http://localhost');
            req.query = Object.fromEntries(url.searchParams.entries());
            if (!res.status) {
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
            }
            if (!res.json) {
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return res;
              };
            }
            await handler(req, res);
            return;
          } catch (err) {
            next(err);
            return;
          }
        }
        if (req.url && req.url.startsWith('/api/generate')) {
          try {
            const { default: handler } = await import('./api/generate.js');
            const url = new URL(req.url, 'http://localhost');
            req.query = Object.fromEntries(url.searchParams.entries());
            if (!res.status) {
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
            }
            if (!res.json) {
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return res;
              };
            }
            if (req.method === 'POST' && !req.body) {
              const buffers = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const raw = Buffer.concat(buffers).toString();
              try {
                req.body = raw ? JSON.parse(raw) : {};
              } catch {
                req.body = {};
              }
            }
            await handler(req, res);
            return;
          } catch (err) {
            next(err);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
