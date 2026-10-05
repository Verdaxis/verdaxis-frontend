import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RouteMetadata } from '../components/RouteMetadata';
import { getEducationArticles } from '../data/educationArticles';
import {
  INDEXABLE_PUBLIC_PATHS,
  SITE_ORIGIN,
  isKnownPublicPath,
  renderRouteHtml,
  resolveRouteMetadata,
  EDUCATION_SLUGS,
} from '../routeMetadata';

function NavigateToPrivate() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate('/invite/private-code-123')}>private route</button>;
}

describe('route metadata', () => {
  it('defines unique canonical metadata for every indexable English and Chinese URL', () => {
    expect(INDEXABLE_PUBLIC_PATHS).toHaveLength(52);
    expect(new Set(INDEXABLE_PUBLIC_PATHS).size).toBe(INDEXABLE_PUBLIC_PATHS.length);

    for (const pathname of INDEXABLE_PUBLIC_PATHS) {
      const metadata = resolveRouteMetadata(pathname);
      expect(metadata.title).toMatch(/Verdaxis/);
      expect(metadata.description.length).toBeGreaterThan(15);
      expect(metadata.robots).toContain('index,follow');
      expect(metadata.canonical).toBe(`${SITE_ORIGIN}${pathname}`);
      const englishPath = pathname.replace(/^\/(?:en|zh)(?=\/)/, '/en');
      const chinesePath = pathname.replace(/^\/(?:en|zh)(?=\/)/, '/zh');
      expect(metadata.alternates).toEqual({
        en: `${SITE_ORIGIN}${englishPath}`, zh: `${SITE_ORIGIN}${chinesePath}`, 'x-default': `${SITE_ORIGIN}${englishPath}`,
      });
    }
  });

  it('keeps the metadata article inventory aligned with the rendered catalog', () => {
    expect(getEducationArticles().map(({ slug }) => slug)).toEqual(EDUCATION_SLUGS);
  });

  it('keeps token, completion, dashboard, preview, and unknown URLs out of metadata', () => {
    const paths = [
      '/invite/private-code-123',
      '/reset-password?token=private-code-123',
      '/verify-email?token=private-code-123',
      '/thank-you',
      '/app/m/bio-methanol/singapore/spot',
      '/partners-preview',
      '/en/partners/unlisted-campaign',
      '/en/education/not-an-article',
      '/not-a-route',
    ];

    for (const pathname of paths) {
      const metadata = resolveRouteMetadata(pathname);
      expect(metadata.robots).toBe('noindex,nofollow,noarchive');
      expect(metadata.canonical).toBeUndefined();
      expect(`${metadata.title} ${metadata.description}`).not.toContain('private-code-123');
      expect(INDEXABLE_PUBLIC_PATHS).not.toContain(pathname);
    }
  });

  it('classifies only real catalog-backed public routes as known', () => {
    expect(isKnownPublicPath('/en/fuels/maritime')).toBe(true);
    expect(isKnownPublicPath('/zh/education/fueleu-maritime-guide')).toBe(true);
    expect(isKnownPublicPath('/en/fuels/unknown')).toBe(false);
    expect(isKnownPublicPath('/en/education/unknown')).toBe(false);
    expect(isKnownPublicPath('/en/partners/arbitrary')).toBe(false);
    expect(isKnownPublicPath('/en/toString')).toBe(false);
    expect(resolveRouteMetadata('/en/toString').robots).toBe('noindex,nofollow,noarchive');
    expect(isKnownPublicPath('/unknown')).toBe(false);
  });

  it('matches the production sitemap to the shared indexable-route inventory', () => {
    const xml = readFileSync(path.resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const urls = Array.from(document.querySelectorAll('loc'), (node) => node.textContent);
    expect(urls).toHaveLength(INDEXABLE_PUBLIC_PATHS.length);
    expect(new Set(urls)).toEqual(new Set(INDEXABLE_PUBLIC_PATHS.map((pathname) => `${SITE_ORIGIN}${pathname}`)));
    expect(xml).not.toMatch(/thank-you|\/app|\/login|partners-preview/);
  });

  it('keeps Vercel redirects permanent, query-safe, and limited to public routes', () => {
    const redirects = (JSON.parse(readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      redirects: Array<{
        source: string; destination: string; permanent: boolean;
        has?: Array<{ type: string; value: string }>;
      }>;
    }).redirects;
    const [wwwRoot, wwwPaths, publicRoot] = redirects;

    expect(wwwRoot).toMatchObject({
      source: '/',
      destination: 'https://verdaxis.exchange/en/',
      permanent: true,
      has: [{ type: 'host', value: 'www\\.verdaxis\\.exchange' }],
    });
    expect(wwwPaths).toMatchObject({
      source: '/:path*',
      destination: 'https://verdaxis.exchange/:path*',
      permanent: true,
      has: [{ type: 'host', value: 'www\\.verdaxis\\.exchange' }],
    });
    expect(publicRoot).toMatchObject({ source: '/', destination: '/en/', permanent: true });

    expect(redirects.every(({ permanent }) => permanent)).toBe(true);
    expect(redirects.every(({ destination }) => !destination.includes('?'))).toBe(true);
    const hostAgnosticSources = redirects.filter(({ has }) => !has).map(({ source }) => source);
    expect(hostAgnosticSources).not.toContain('/:path*');
    expect(hostAgnosticSources).not.toContain('/(.*)');
  });

  it('renders crawler metadata into localized HTML and forces staging noindex', () => {
    const template = '<html lang="en"><head><!-- route-metadata:start --><title>Old</title><!-- route-metadata:end --></head></html>';
    const metadata = resolveRouteMetadata('/zh/how-it-works');
    const html = renderRouteHtml(template, metadata, true);

    expect(html).toContain('hreflang="x-default" href="https://verdaxis.exchange/en/how-it-works"');
    expect(html).toContain('hreflang="zh" href="https://verdaxis.exchange/zh/how-it-works"');
    expect(html).toContain('id="verdaxis-structured-data"');
    expect(html).toContain('<html lang="zh">');
    expect(html).toContain(metadata.title);
    expect(html).toContain('name="robots" content="noindex,nofollow,noarchive"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('Verdaxis — Low Carbon Fuels Exchange');
  });

  it('updates route-specific browser metadata and removes public canonicals on private navigation', () => {
    render(
      <MemoryRouter initialEntries={['/en/how-it-works']}>
        <RouteMetadata />
        <NavigateToPrivate />
      </MemoryRouter>,
    );

    expect(document.title).toBe('How Verdaxis Works | Verdaxis');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('structured listings');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_ORIGIN}/en/how-it-works`);

    const alternates = Array.from(document.head.querySelectorAll('link[rel="alternate"]'));
    expect(alternates).toHaveLength(3);
    expect(alternates.map((element) => element.getAttribute('hreflang'))).toEqual(['en', 'zh', 'x-default']);

    const structuredDataElement = document.head.querySelector('#verdaxis-structured-data');
    expect(structuredDataElement).not.toBeNull();
    const structuredData = JSON.parse(structuredDataElement?.textContent ?? '{}');
    const types = structuredData['@graph'].map((entry: { '@type': string }) => entry['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'WebPage']);
    expect(JSON.stringify(structuredData)).not.toMatch(/AggregateRating|Offer|PostalAddress|Person/);

    fireEvent.click(screen.getByRole('button', { name: 'private route' }));

    expect(document.title).toBe('Invitation | Verdaxis');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow,noarchive');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelectorAll('link[rel="alternate"]')).toHaveLength(0);
    expect(document.head.querySelector('#verdaxis-structured-data')).toBeNull();
    expect(document.head.textContent).not.toContain('private-code-123');
  });
});
