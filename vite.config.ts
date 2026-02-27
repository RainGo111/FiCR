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
          target: env.GRAPHDB_URL || 'http://localhost:7200/repositories/FiCR',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/graphdb/, ''),
          configure: (proxy, _options) => {
            console.log('Proxying /api/graphdb to:', env.GRAPHDB_URL || 'http://localhost:7200/repositories/FiCR');
            proxy.on('proxyReq', (proxyReq, _req, _res) => {
              const user = env.GRAPHDB_USER || 'admin';
              const pass = env.GRAPHDB_PASS || 'root';
              const auth = Buffer.from(`${user}:${pass}`).toString('base64');
              proxyReq.setHeader('Authorization', `Basic ${auth}`);
            });
          },
        },
        '/api/chatbot': {
          target: env.CHATBOT_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/chatbot/, ''),
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
