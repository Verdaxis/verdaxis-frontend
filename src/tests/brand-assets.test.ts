import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LOGO_MARK_SRC_SET,
  PARTNER_LOGOS,
  WORDMARK_SRC_SET,
} from '../utils/brandImages';

const brandAssets = {
  'verdaxis-logo-no-words.png': { dimensions: [732, 654], colorType: 6, maxBytes: 350_700 },
  'verdaxis-logo-words-right.png': { dimensions: [1293, 291], colorType: 6, maxBytes: 139_064 },
  'verdaxis-logo-words-bottom.png': { dimensions: [966, 585], colorType: 6, maxBytes: 246_853 },
  'verdaxis-logo-mark-96.png': { dimensions: [96, 86], colorType: 6, maxBytes: 15_000 },
  'verdaxis-logo-words-right-384.png': { dimensions: [384, 86], colorType: 6, maxBytes: 30_000 },
  'verdaxis-favicon-64.png': { dimensions: [64, 64], colorType: 6, maxBytes: 8_000 },
  'verdaxis-social-card.png': { dimensions: [1200, 630], colorType: 6, maxBytes: 90_000 },
  'partner-platts-128.png': { dimensions: [128, 72], colorType: 3, maxBytes: 3_000 },
  'partner-gena-128.png': { dimensions: [128, 46], colorType: 6, maxBytes: 12_000 },
};

describe('brand assets', () => {
  it.each(Object.entries(brandAssets))('%s keeps its dimensions, pixel format, and size budget', (name, asset) => {
    const png = readFileSync(join(process.cwd(), 'public', name));
    const [width, height] = asset.dimensions;

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(asset.colorType);
    expect(png.byteLength).toBeLessThanOrEqual(asset.maxBytes);
  });

  it('uses the optimized square favicon in the HTML shell', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const favicon = html.match(/<link\b(?=[^>]*\brel="icon")[^>]*>/)?.[0];

    expect(favicon).toContain('href="/verdaxis-favicon-64.png"');
    expect(favicon).toContain('type="image/png"');
    expect(favicon).toContain('sizes="64x64"');
  });
});

const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return ['tests', '__tests__'].includes(entry.name) ? [] : sourceFiles(path);
  return /\.(?:tsx|css|html|svg)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
});

const renderedSourceFiles = () => [
  ...sourceFiles(join(process.cwd(), 'src')),
  ...sourceFiles(join(process.cwd(), 'public')),
  join(process.cwd(), 'index.html'),
];

describe('rendered images', () => {
  it('keeps alt text and intrinsic dimensions on every image', () => {
    const images = renderedSourceFiles().flatMap((file) => (
      [...readFileSync(file, 'utf8').matchAll(/<img\b[\s\S]*?\/>/g)].map(([tag]) => ({ file, tag }))
    ));

    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.tag, image.file).toMatch(/\balt\s*=/);
      expect(image.tag, image.file).toMatch(/\bwidth\s*=/);
      expect(image.tag, image.file).toMatch(/\bheight\s*=/);
      if (/\balt\s*=\s*""/.test(image.tag)) {
        expect(image.tag, image.file).toMatch(/\baria-hidden\s*=\s*"true"/);
      }
    }
  });

  it('flags SVG image elements and CSS URL-backed images for review', () => {
    const sources = renderedSourceFiles().map((file) => readFileSync(file, 'utf8')).join('\n');

    expect(sources).not.toMatch(/<image\b/i);
    expect(sources).not.toMatch(/(?:background(?:Image|-image)?|mask(?:Image|-image))\s*[:=][^;\n]*(?:url|image-set)\(/i);
  });

  it('gives every srcSet a sizes hint, so the browser can pick a candidate', () => {
    for (const file of renderedSourceFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const [tag] of source.matchAll(/<img\b[\s\S]*?\/>/g)) {
        if (!/\bsrcSet\s*=/.test(tag)) continue;
        expect(tag, file).toMatch(/\bsizes\s*=/);
      }
    }
  });
});

/**
 * Lossless WebP files served through `srcSet`, keyed by file name with the
 * pixel size each one carries: 1x and 2x of the width the place renders it.
 */
const sizedBrandImages = {
  'logo-wordmark-152.webp': [152, 34],
  'logo-wordmark-304.webp': [304, 68],
  'logo-wordmark-428.webp': [428, 96],
  'logo-mark-32.webp': [32, 29],
  'logo-mark-64.webp': [64, 57],
  'partner-platts-64.webp': [64, 36],
  'partner-platts-128.webp': [128, 72],
  'partner-gena-64.webp': [64, 23],
  'partner-gena-128.webp': [128, 46],
} as const;

/**
 * Read the canvas size out of a lossless (`VP8L`) WebP header: after the
 * `RIFF….WEBPVP8L` marker and the 0x2F signature byte, width and height are
 * stored in 14 bits each, biased by one.
 */
const readWebpSize = (bytes: Buffer): [number, number] => {
  expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
  expect(bytes.subarray(12, 16).toString()).toBe('VP8L');
  const packed = bytes.readUInt32LE(21);
  return [(packed & 0x3fff) + 1, ((packed >> 14) & 0x3fff) + 1];
};

/** `srcSet` entries as `{ file, descriptor }`, e.g. `logo-wordmark-152.webp 152w`. */
const srcSetCandidates = (srcSet: string) => srcSet.split(', ').map((candidate) => {
  const [url, descriptor] = candidate.split(' ');
  return { file: url.split('/').pop() ?? url, descriptor };
});

describe('right-sized WebP brand images', () => {
  it.each(Object.entries(sizedBrandImages))('%s is a lossless WebP at its named size', (name, size) => {
    const bytes = readFileSync(join(process.cwd(), 'src/assets/brand', name));

    expect(readWebpSize(bytes)).toEqual(size);
  });

  it('sizes each candidate to the width its descriptor promises', () => {
    const srcSets = [WORDMARK_SRC_SET, LOGO_MARK_SRC_SET, ...Object.values(PARTNER_LOGOS)];

    for (const srcSet of srcSets) {
      for (const { file, descriptor } of srcSetCandidates(srcSet)) {
        const width = Number(descriptor.replace('w', ''));

        expect(descriptor).toMatch(/^\d+w$/);
        expect(file).toMatch(new RegExp(`-${width}\\.webp$`));
        expect(Number(readWebpSize(readFileSync(
          join(process.cwd(), 'src/assets/brand', file)))[0]), file).toBe(width);
      }
    }
  });

  it('keeps a public PNG fallback for every partner logo it replaces', () => {
    expect(Object.keys(PARTNER_LOGOS)).not.toHaveLength(0);
    for (const [png, srcSet] of Object.entries(PARTNER_LOGOS)) {
      expect(() => readFileSync(join(process.cwd(), 'public', png))).not.toThrow();
      expect(srcSetCandidates(srcSet).map(({ descriptor }) => descriptor)).toEqual(['64w', '128w']);
    }
  });

  it('ships no orphan WebP: every file belongs to a srcSet', () => {
    const shipped = readdirSync(join(process.cwd(), 'src/assets/brand')).sort();
    const referenced = [WORDMARK_SRC_SET, LOGO_MARK_SRC_SET, ...Object.values(PARTNER_LOGOS)]
      .flatMap(srcSetCandidates).map(({ file }) => file).sort();

    expect(shipped).toEqual([...new Set(referenced)]);
  });
});
