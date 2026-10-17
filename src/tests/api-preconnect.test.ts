import { describe, expect, it } from 'vitest';

import { buildPreconnectTags, externalOrigin, MAPBOX_API_ORIGIN } from '../build/preconnect';

describe('API preconnect tags', () => {
  it('takes the origin from an absolute API URL', () => {
    expect(externalOrigin('https://api.verdaxis.exchange/api')).toBe('https://api.verdaxis.exchange');
    expect(externalOrigin('http://127.0.0.1:54321/api')).toBe('http://127.0.0.1:54321');
  });

  it('has no origin for a relative (local proxied) API URL', () => {
    expect(externalOrigin('/api')).toBeUndefined();
    expect(externalOrigin(undefined)).toBeUndefined();
    expect(externalOrigin('')).toBeUndefined();
  });

  it('emits preconnect + dns-prefetch for the API origin and preconnect for Mapbox', () => {
    const tags = buildPreconnectTags('https://api.verdaxis.exchange/api');
    expect(tags).toEqual([
      { tag: 'link', attrs: { rel: 'preconnect', href: 'https://api.verdaxis.exchange', crossorigin: '' }, injectTo: 'head-prepend' },
      { tag: 'link', attrs: { rel: 'dns-prefetch', href: 'https://api.verdaxis.exchange' }, injectTo: 'head-prepend' },
      { tag: 'link', attrs: { rel: 'preconnect', href: MAPBOX_API_ORIGIN, crossorigin: '' }, injectTo: 'head-prepend' },
    ]);
  });

  it('emits only the Mapbox preconnect for a relative API URL', () => {
    const tags = buildPreconnectTags('/api');
    expect(tags).toHaveLength(1);
    expect(tags[0].attrs?.href).toBe(MAPBOX_API_ORIGIN);
  });
});
