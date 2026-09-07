import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export const RELEASE_API_URLS = {
    production: 'https://api.verdaxis.exchange/api',
    staging: 'https://api-staging.verdaxis.exchange/api',
} as const;

export function validateReleaseApiUrl(
    mode: string,
    loadedEnv: Record<string, string>,
    inheritedEnv: Record<string, string | undefined> = process.env,
) {
    const expected = RELEASE_API_URLS[mode as keyof typeof RELEASE_API_URLS];
    if (!expected) return;

    const inherited = Object.prototype.hasOwnProperty.call(inheritedEnv, 'VITE_API_URL');
    const actual = (inherited ? inheritedEnv.VITE_API_URL : loadedEnv.VITE_API_URL)?.trim();
    if (actual !== expected) {
        throw new Error(`Invalid VITE_API_URL for ${mode} build`);
    }
}

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, '.', '');
    if (command === 'build') validateReleaseApiUrl(mode, env);
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
      build: {
        // SECURITY: Disable source maps in production to prevent source code exposure
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-i18n': ['i18next', 'i18next-browser-languagedetector', 'react-i18next'],
              'vendor-clsx': ['clsx'],
              'vendor-lightweight-charts': ['lightweight-charts'],
              'vendor-recharts': ['recharts'],
              'vendor-maplibre': ['maplibre-gl'],
              'vendor-leaflet': ['leaflet', 'react-leaflet'],
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
