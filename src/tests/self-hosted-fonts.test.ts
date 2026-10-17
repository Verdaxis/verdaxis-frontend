import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFontPreloadTags, injectFontPreloads, PRELOADED_FONT_FILES } from '../build/fontPreload';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

/**
 * The faces the shell served through Google Fonts before step 3b — the eight
 * faces the site uses, in each of the two Google slices it serves them in.
 * Lato is static per weight; Montserrat and JetBrains Mono share one variable
 * file per slice. The order is the declaration order in `src/index.css`: the
 * `latin` rules first, then the `latin-ext` ones.
 *
 * `latin-ext` is not decoration: it carries the letters port and company names
 * use (Gdańsk, İstanbul, Constanța, Świnoujście). Dropping it puts a system font
 * in the middle of a word.
 */
const REQUIRED_FACES = [
  ['Lato', '300', 'latin', 'lato-latin-300-normal.woff2'],
  ['Lato', '400', 'latin', 'lato-latin-400-normal.woff2'],
  ['Lato', '700', 'latin', 'lato-latin-700-normal.woff2'],
  ['Montserrat', '500', 'latin', 'montserrat-latin-500-700-normal.woff2'],
  ['Montserrat', '600', 'latin', 'montserrat-latin-500-700-normal.woff2'],
  ['Montserrat', '700', 'latin', 'montserrat-latin-500-700-normal.woff2'],
  ['JetBrains Mono', '400', 'latin', 'jetbrains-mono-latin-400-600-normal.woff2'],
  ['JetBrains Mono', '600', 'latin', 'jetbrains-mono-latin-400-600-normal.woff2'],
  ['Lato', '300', 'latin-ext', 'lato-latin-ext-300-normal.woff2'],
  ['Lato', '400', 'latin-ext', 'lato-latin-ext-400-normal.woff2'],
  ['Lato', '700', 'latin-ext', 'lato-latin-ext-700-normal.woff2'],
  ['Montserrat', '500', 'latin-ext', 'montserrat-latin-ext-500-700-normal.woff2'],
  ['Montserrat', '600', 'latin-ext', 'montserrat-latin-ext-500-700-normal.woff2'],
  ['Montserrat', '700', 'latin-ext', 'montserrat-latin-ext-500-700-normal.woff2'],
  ['JetBrains Mono', '400', 'latin-ext', 'jetbrains-mono-latin-ext-400-600-normal.woff2'],
  ['JetBrains Mono', '600', 'latin-ext', 'jetbrains-mono-latin-ext-400-600-normal.woff2'],
] as const;

const LATIN_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, '
  + 'U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, '
  + 'U+2212, U+2215, U+FEFF, U+FFFD';

/** Google's `latin-ext` range, which does not overlap the `latin` one. */
const LATIN_EXT_RANGE = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, '
  + 'U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, '
  + 'U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF';

const RANGES = { latin: LATIN_RANGE, 'latin-ext': LATIN_EXT_RANGE } as const;

const fontFaces = () => [...read('src/index.css').matchAll(/@font-face\s*\{([^}]*)\}/g)]
  .map(([, body]) => ({
    family: body.match(/font-family:\s*'([^']+)'/)?.[1],
    weight: body.match(/font-weight:\s*(\d+)/)?.[1],
    display: body.match(/font-display:\s*([a-z]+)/)?.[1],
    url: body.match(/url\('([^']+)'\)/)?.[1],
    range: body.match(/unicode-range:\s*([^;]+);/)?.[1].replace(/\s+/g, ' ').trim(),
  }));

describe('self-hosted fonts', () => {
  it('serves every family, weight and Google slice from a local hashed asset', () => {
    const faces = fontFaces();

    expect(faces.map(({ family, weight }) => [family, weight]))
      .toEqual(REQUIRED_FACES.map(([family, weight]) => [family, weight]));
    for (const [index, face] of faces.entries()) {
      const [family, weight, subset, file] = REQUIRED_FACES[index];
      const label = `${family} ${weight} ${subset}`;
      expect(face.url, label).toBe(`./assets/fonts/${file}`);
      expect(existsSync(join(process.cwd(), 'src', face.url!.slice(2))), label).toBe(true);
      expect(face.display, label).toBe('swap');
      expect(face.range, label).toBe(RANGES[subset]);
    }
  });

  it('ships the ten pinned files as real woff2 binaries', () => {
    const files = new Set(REQUIRED_FACES.map(([, , , file]) => file));

    expect(files.size).toBe(10);
    for (const file of files) {
      const bytes = readFileSync(join(process.cwd(), 'src', 'assets', 'fonts', file));
      expect(bytes.subarray(0, 4).toString('latin1'), file).toBe('wOF2');
      expect(bytes.byteLength, file).toBeGreaterThan(1000);
    }
  });

  it('preloads no Latin Extended file, which unicode-range loads on demand', () => {
    expect(PRELOADED_FONT_FILES.some((stem) => stem.includes('latin-ext'))).toBe(false);
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

  it('injects the preloads directly after the charset', () => {
    const html = injectFontPreloads(
      '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <link rel="stylesheet" href="/assets/index-abc123.css" />\n  </head>\n</html>',
      ['assets/lato-latin-400-normal-911dda87.woff2',
       'assets/montserrat-latin-500-700-normal-7d54aa8b.woff2']);

    expect(html).toBe([
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/lato-latin-400-normal-911dda87.woff2" />',
      '    <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/montserrat-latin-500-700-normal-7d54aa8b.woff2" />',
      '    <link rel="stylesheet" href="/assets/index-abc123.css" />',
      '  </head>',
      '</html>',
    ].join('\n'));
    expect(html.match(/rel="preload"/g)).toHaveLength(PRELOADED_FONT_FILES.length);
  });

  it('keeps the charset ahead of the preloads in a head tag with attributes', () => {
    const html = injectFontPreloads('<head data-x="1"><meta charset="UTF-8" /><link rel="stylesheet" href="/a.css" /></head>',
      ['assets/lato-latin-400-normal-911dda87.woff2',
       'assets/montserrat-latin-500-700-normal-7d54aa8b.woff2']);

    expect(html).toMatch(/^<head data-x="1"><meta charset="UTF-8" \/>\n {4}<link rel="preload"/);
    expect(html.indexOf('charset')).toBeLessThan(html.indexOf('rel="preload"'));
    expect(html.indexOf('rel="preload"')).toBeLessThan(html.indexOf('rel="stylesheet"'));
  });

  it('fails the build when the shell has no charset element', () => {
    expect(() => injectFontPreloads('<head><link rel="stylesheet" href="/a.css" /></head>',
      ['assets/lato-latin-400-normal-911dda87.woff2',
       'assets/montserrat-latin-500-700-normal-7d54aa8b.woff2']))
      .toThrow('index.html has no <meta charset> element in <head>');
  });

  it('fails the build when a preloaded font is not emitted', () => {
    expect(() => buildFontPreloadTags(['assets/app-abc123.js']))
      .toThrow("Preloaded font asset 'lato-latin-400-normal' was not emitted");
    expect(() => injectFontPreloads('<head></head>', ['assets/app-abc123.js']))
      .toThrow("Preloaded font asset 'lato-latin-400-normal' was not emitted");
  });
});
