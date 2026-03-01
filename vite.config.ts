import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://144.126.151.136:8000',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      // SECURITY: No API keys in define{} — all AI calls go through backend /api/ai/chat
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
