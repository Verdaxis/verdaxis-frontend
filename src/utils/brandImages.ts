/**
 * Right-sized WebP brand images for `srcSet` (refactor step 3b).
 *
 * Every file is a lossless WebP cut to 1x and 2x of the width the place renders
 * it, produced by `scripts/optimize-brand-images.sh`. Vite hashes them into
 * `/assets/`, so they are immutable and cacheable. The matching `public/*.png`
 * stays in place as the `<img src>` fallback and as the public URL other
 * readers depend on (the social card, the favicon, the structured-data logo and
 * the master files the generator starts from).
 *
 * The assets are imported rather than written as `/assets/...` strings because
 * only the bundler knows the content hash; a hard-coded path would 404 in
 * production, and `build.assetsInlineLimit` is 0 so these stay separate files
 * instead of becoming data URIs inside a route chunk.
 */
import logoMark32 from '../assets/brand/logo-mark-32.webp';
import logoMark64 from '../assets/brand/logo-mark-64.webp';
import logoWordmark152 from '../assets/brand/logo-wordmark-152.webp';
import logoWordmark304 from '../assets/brand/logo-wordmark-304.webp';
import logoWordmark428 from '../assets/brand/logo-wordmark-428.webp';
import partnerGena64 from '../assets/brand/partner-gena-64.webp';
import partnerGena128 from '../assets/brand/partner-gena-128.webp';
import partnerPlatts64 from '../assets/brand/partner-platts-64.webp';
import partnerPlatts128 from '../assets/brand/partner-platts-128.webp';

/**
 * The "Verdaxis" wordmark. The navigation renders it 152 CSS px wide and the
 * footer 154, so 152w covers a 1x screen and 304w a 2x screen; 428w serves the
 * places that draw it larger (the 180 px mobile gate, the 214 px invitation
 * header) and 2.8x screens.
 */
export const WORDMARK_SRC_SET =
  `${logoWordmark152} 152w, ${logoWordmark304} 304w, ${logoWordmark428} 428w`;

/** The square mark, drawn 32 CSS px wide in the sidebar's logo tile. */
export const LOGO_MARK_SRC_SET = `${logoMark32} 32w, ${logoMark64} 64w`;

/**
 * Partner logos, keyed by the public PNG each one replaces. All three call
 * sites (64 px, 56 px and 48 px tiles) sit inside the 1x/2x range of a 64 px
 * candidate, so the whole 64 px grid shares one ladder.
 */
export const PARTNER_LOGOS: Record<string, string> = {
  '/partner-platts-128.png': `${partnerPlatts64} 64w, ${partnerPlatts128} 128w`,
  '/partner-gena-128.png': `${partnerGena64} 64w, ${partnerGena128} 128w`,
};
