import path from 'path';
import { rm, writeFile } from 'node:fs/promises';
import { createServer, defineConfig, loadEnv, type Plugin } from 'vite';
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

const PRERENDER_VISIBILITY_STYLE = `
    <style data-public-prerender-style>
      body:has(#root > [data-public-prerender]) {
        height: auto !important;
        overflow: auto !important;
      }
      [data-public-prerender] [style="opacity:0"],
      [data-public-prerender] [style^="opacity:0;"],
      [data-public-prerender] [style*=";opacity:0;"],
      [data-public-prerender] [style$=";opacity:0"] {
        opacity: 1 !important;
        transform: none !important;
      }
    </style>`;

function renderPrerenderedBody(html: string, content: string): string {
    const startMarker = '<!-- public-prerender:start -->';
    const endMarker = '<!-- public-prerender:end -->';
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker);
    if (start < 0 || end < start) {
        throw new Error('Built index.html public prerender markers are missing');
    }

    const contentStart = start + startMarker.length;
    const withContent = `${html.slice(0, contentStart)}\n      <div data-public-prerender>${content}</div>\n      ${html.slice(end)}`;
    return withContent.replace('</head>', `${PRERENDER_VISIBILITY_STYLE}\n  </head>`);
}

export function staticRouteMetadataPlugin(mode: string): Plugin {
    const isStaging = mode === 'staging';
    return {
        name: 'verdaxis-static-route-metadata',
        apply: 'build',
        enforce: 'post',
        async generateBundle(_options, bundle) {
            const entry = bundle['index.html'];
            if (!entry || entry.type !== 'asset' || typeof entry.source !== 'string') {
                throw new Error('Vite did not emit index.html');
            }

            const template = entry.source;
            entry.source = renderRouteHtml(template, resolveRouteMetadata('/not-found'), true);

            const server = await createServer({
                appType: 'custom',
                configFile: false,
                logLevel: 'error',
                mode,
                root: process.cwd(),
                plugins: [react()],
                resolve: {
                    // React Router's Node export is CommonJS. Point the build-only
                    // module runner at its ESM files so public pages can render
                    // without changing browser resolution.
                    alias: [
                        { find: /^react-router-dom$/, replacement: path.resolve(__dirname, './node_modules/react-router-dom/dist/index.mjs') },
                        { find: /^react-router\/dom$/, replacement: path.resolve(__dirname, './node_modules/react-router/dist/development/dom-export.mjs') },
                        { find: /^react-router$/, replacement: path.resolve(__dirname, './node_modules/react-router/dist/development/index.mjs') },
                        { find: '@', replacement: path.resolve(__dirname, './src') },
                    ],
                },
                server: { middlewareMode: true },
                ssr: { noExternal: ['react-router', 'react-router-dom'] },
            });
            try {
                const renderer = await server.ssrLoadModule('/src/prerender/renderPublicRoute.tsx') as {
                    renderPublicRoute: (pathname: string) => Promise<string>;
                };
                for (const pathname of INDEXABLE_PUBLIC_PATHS) {
                    const outputPath = `${pathname.replace(/^\/+|\/+$/g, '')}/index.html`;
                    const content = await renderer.renderPublicRoute(pathname);
                    const routeHtml = renderRouteHtml(template, resolveRouteMetadata(pathname), isStaging);
                    this.emitFile({
                        type: 'asset',
                        fileName: outputPath,
                        source: renderPrerenderedBody(routeHtml, content),
                    });
                }
            } finally {
                await server.close();
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
            target: env.DEV_API_PROXY_TARGET?.trim() || 'http://127.0.0.1:8000',
            changeOrigin: true,
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
