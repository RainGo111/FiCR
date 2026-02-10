import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: mode === 'production' ? '/FiCR/' : '/',
    plugins: [react()],
    server: {
      proxy: {
        '/api/graphdb': {
          target: env.GRAPHDB_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/graphdb/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, _req, _res) => {
              const auth = Buffer.from(`${env.GRAPHDB_USER}:${env.GRAPHDB_PASS}`).toString('base64');
              proxyReq.setHeader('Authorization', `Basic ${auth}`);
              // GraphDB expects standard SPARQL protocol or form-urlencoded with 'query' param
              // We will send application/x-www-form-urlencoded from the client, so just forwarding is sufficient.
              // But if we want to force Auth, we do it here.
            });
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
