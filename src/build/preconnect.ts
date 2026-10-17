/**
 * Preconnect tags for `index.html`.
 *
 * These are pure so a test can assert them without importing `vite.config.ts`
 * (which pulls esbuild into a jsdom environment it cannot run in). The config
 * imports this module for the build; the app never does.
 */
export const MAPBOX_API_ORIGIN = 'https://api.mapbox.com';

export interface HtmlLinkTag {
  tag: 'link';
  attrs: Record<string, string>;
  injectTo: 'head-prepend';
}

/**
 * The external origin of a configured API URL, or `undefined` for a relative
 * URL (local development proxies `/api`, so there is no origin to preconnect).
 */
export function externalOrigin(apiUrl: string | undefined): string | undefined {
  const value = apiUrl?.trim();
  if (!value || !/^https?:\/\//i.test(value)) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/**
 * Preconnect (with a `dns-prefetch` fallback) to the API origin the bundle was
 * built against, and to the Mapbox API. Every authenticated session opens the
 * API connection first and every map visit opens the Mapbox one, so both save a
 * DNS lookup and TLS handshake. Derived at build time from `VITE_API_URL` so
 * the tag matches the bundle's real target.
 */
export function buildPreconnectTags(apiUrl: string | undefined): HtmlLinkTag[] {
  const tags: HtmlLinkTag[] = [];
  const origin = externalOrigin(apiUrl);
  if (origin) {
    tags.push({
      tag: 'link',
      attrs: { rel: 'preconnect', href: origin, crossorigin: '' },
      injectTo: 'head-prepend',
    });
    tags.push({
      tag: 'link',
      attrs: { rel: 'dns-prefetch', href: origin },
      injectTo: 'head-prepend',
    });
  }
  tags.push({
    tag: 'link',
    attrs: { rel: 'preconnect', href: MAPBOX_API_ORIGIN, crossorigin: '' },
    injectTo: 'head-prepend',
  });
  return tags;
}
