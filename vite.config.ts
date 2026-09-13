import path from 'path';
import { rm, writeFile } from 'node:fs/promises';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
    INDEXABLE_PUBLIC_PATHS,
    renderRouteHtml,
    resolveRouteMetadata,
} from './src/routeMetadata';

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
