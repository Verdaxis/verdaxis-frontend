import path from 'path';
import { rm, writeFile } from 'node:fs/promises';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
    INDEXABLE_PUBLIC_PATHS,
    renderRouteHtml,
    resolveRouteMetadata,
} from './src/routeMetadata';

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

export function staticRouteMetadataPlugin(mode: string): Plugin {
    const isStaging = mode === 'staging';
    return {
        name: 'verdaxis-static-route-metadata',
        apply: 'build',
        enforce: 'post',
        generateBundle(_options, bundle) {
            const entry = bundle['index.html'];
            if (!entry || entry.type !== 'asset' || typeof entry.source !== 'string') {
                throw new Error('Vite did not emit index.html');
            }

            const template = entry.source;
            entry.source = renderRouteHtml(template, resolveRouteMetadata('/not-found'), true);

            for (const pathname of INDEXABLE_PUBLIC_PATHS) {
                const outputPath = `${pathname.replace(/^\/+|\/+$/g, '')}/index.html`;
                this.emitFile({
                    type: 'asset',
                    fileName: outputPath,
                    source: renderRouteHtml(template, resolveRouteMetadata(pathname), isStaging),
                });
            }

        },
        async writeBundle(options) {
            if (!isStaging) return;
            const outputDirectory = path.resolve(options.dir ?? 'dist');
            await writeFile(path.join(outputDirectory, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
            await rm(path.join(outputDirectory, 'sitemap.xml'), { force: true });
        },
    };
}

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, '.', '');
    if (command === 'build' && ['production', 'staging'].includes(mode)) {
        const mapToken = process.env.VITE_MAPBOX_PUBLIC_TOKEN ?? env.VITE_MAPBOX_PUBLIC_TOKEN;
        if (!mapToken?.startsWith('pk.')) throw new Error('A public VITE_MAPBOX_PUBLIC_TOKEN is required');
    }
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
      plugins: [react(), staticRouteMetadataPlugin(mode)],
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
              'vendor-mapbox': ['mapbox-gl'],
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
