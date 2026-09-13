import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
});
