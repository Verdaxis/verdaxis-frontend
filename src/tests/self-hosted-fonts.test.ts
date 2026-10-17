import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFontPreloadTags, injectFontPreloads, PRELOADED_FONT_FILES } from '../build/fontPreload';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

/**
 * The faces the shell served through Google Fonts before step 3b. Lato is
 * static per weight; Montserrat and JetBrains Mono share one variable file.
 */
const REQUIRED_FACES = [
  ['Lato', '300'],
  ['Lato', '400'],
  ['Lato', '700'],
  ['Montserrat', '500'],
  ['Montserrat', '600'],
  ['Montserrat', '700'],
  ['JetBrains Mono', '400'],
  ['JetBrains Mono', '600'],
] as const;

const LATIN_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, '
  + 'U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, '
  + 'U+2212, U+2215, U+FEFF, U+FFFD';

const fontFaces = () => [...read('src/index.css').matchAll(/@font-face\s*\{([^}]*)\}/g)]
  .map(([, body]) => ({
    family: body.match(/font-family:\s*'([^']+)'/)?.[1],
    weight: body.match(/font-weight:\s*(\d+)/)?.[1],
    display: body.match(/font-display:\s*([a-z]+)/)?.[1],
    url: body.match(/url\('([^']+)'\)/)?.[1],
    range: body.match(/unicode-range:\s*([^;]+);/)?.[1].replace(/\s+/g, ' ').trim(),
  }));

describe('self-hosted fonts', () => {
  it('serves every family and weight from a local hashed asset, Latin only', () => {
    const faces = fontFaces();

    expect(faces.map(({ family, weight }) => [family, weight]))
      .toEqual(REQUIRED_FACES.map(([family, weight]) => [family, weight]));
    for (const face of faces) {
      expect(face.url, `${face.family} ${face.weight}`).toMatch(/^\.\/assets\/fonts\/[a-z0-9-]+\.woff2$/);
      expect(existsSync(join(process.cwd(), 'src', face.url!.slice(2))), face.url!).toBe(true);
      expect(face.display, face.url!).toBe('swap');
      expect(face.range, face.url!).toBe(LATIN_RANGE);
    }
  });

  it('does not load fonts from a third party in the HTML shell', () => {
    const html = read('index.html');

    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    expect(html).not.toMatch(/<link[^>]+fonts\./);
  });

  it('preloads one face per above-the-fold family', () => {
    const tags = buildFontPreloadTags([
      'assets/index-abc123.css',
      'assets/lato-latin-400-normal-911dda87.woff2',
      'assets/montserrat-latin-500-700-normal-7d54aa8b.woff2',
      'assets/lato-latin-700-normal-1234abcd.woff2',
    ]);

    expect(tags).toEqual([
      '<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/lato-latin-400-normal-911dda87.woff2" />',
      '<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/montserrat-latin-500-700-normal-7d54aa8b.woff2" />',
    ]);
    expect(tags).toHaveLength(PRELOADED_FONT_FILES.length);
  });

  it('injects the preloads as the first children of head', () => {
    const html = injectFontPreloads(
      '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n  </head>\n</html>',
      ['assets/lato-latin-400-normal-911dda87.woff2',
       'assets/montserrat-latin-500-700-normal-7d54aa8b.woff2']);

    expect(html).toBe([
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/lato-latin-400-normal-911dda87.woff2" />',
      '    <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/montserrat-latin-500-700-normal-7d54aa8b.woff2" />',
      '    <meta charset="UTF-8" />',
      '  </head>',
      '</html>',
    ].join('\n'));
    expect(html.match(/rel="preload"/g)).toHaveLength(PRELOADED_FONT_FILES.length);
  });

  it('injects the preloads into a head tag that carries attributes', () => {
    const html = injectFontPreloads('<head data-x="1"><meta charset="UTF-8" /></head>',
      ['assets/lato-latin-400-normal-911dda87.woff2',
       'assets/montserrat-latin-500-700-normal-7d54aa8b.woff2']);

    expect(html).toMatch(/^<head data-x="1">\n\s+<link rel="preload"/);
  });

  it('fails the build when a preloaded font is not emitted', () => {
    expect(() => buildFontPreloadTags(['assets/app-abc123.js']))
      .toThrow("Preloaded font asset 'lato-latin-400-normal' was not emitted");
    expect(() => injectFontPreloads('<head></head>', ['assets/app-abc123.js']))
      .toThrow("Preloaded font asset 'lato-latin-400-normal' was not emitted");
  });
});
