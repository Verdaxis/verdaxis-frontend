/**
 * Preload tags for the two above-the-fold webfont files.
 *
 * `index.html` cannot name these files: Vite hashes them from the CSS `url()`
 * references in `src/index.css` at build time. The builders here take the
 * emitted asset names and resolve the two files the first paint needs — Lato's
 * regular face for body copy and Montserrat's variable file, which carries
 * every heading weight. The other faces arrive after first paint with
 * `font-display: swap`.
 *
 * Kept pure so a test can assert the markup without importing `vite.config.ts`.
 */

/** Source file stems, as emitted by Vite (`<stem>-<hash>.woff2`). */
export const PRELOADED_FONT_FILES = [
  'lato-latin-400-normal',
  'montserrat-latin-500-700-normal',
] as const;

/** Vite writes `assets/<stem>-<hash>.woff2`, so a stem matches its one file. */
function findFontAsset(emittedFiles: string[], stem: string): string | undefined {
  return emittedFiles.find((file) => {
    const base = file.split('/').pop() ?? file;
    return base.startsWith(`${stem}-`) && base.endsWith('.woff2');
  });
}

/** The two `<link rel="preload" …>` elements, in first-paint order. */
export function buildFontPreloadTags(emittedFiles: string[]): string[] {
  return PRELOADED_FONT_FILES.map((stem) => {
    const file = findFontAsset(emittedFiles, stem);
    if (!file) throw new Error(`Preloaded font asset '${stem}' was not emitted`);
    return `<link rel="preload" as="font" type="font/woff2" crossorigin href="/${file}" />`;
  });
}

const HEAD_OPEN = /<head(?:\s[^>]*)?>/;

/**
 * Insert the preload links as the first children of `<head>`, ahead of the
 * charset and the stylesheet, so the browser starts the font requests as early
 * as the tags are parsed.
 */
export function injectFontPreloads(html: string, emittedFiles: string[]): string {
  const match = HEAD_OPEN.exec(html);
  if (!match) throw new Error('index.html has no <head> element');
  const links = buildFontPreloadTags(emittedFiles).map((tag) => `    ${tag}`).join('\n');
  const at = match.index + match[0].length;
  return `${html.slice(0, at)}\n${links}${html.slice(at)}`;
}
