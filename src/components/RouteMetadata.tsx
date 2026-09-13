import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  SITE_ORIGIN,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_PATH,
  resolveRouteMetadata,
} from '../routeMetadata';

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
}

function setCanonical(href?: string) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  const element = existing ?? document.createElement('link');
  element.rel = 'canonical';
  element.href = href;
  if (!existing) document.head.appendChild(element);
}

export function RouteMetadata() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const metadata = resolveRouteMetadata(pathname, i18n.language);
    const image = `${SITE_ORIGIN}${SOCIAL_IMAGE_PATH}`;

    document.title = metadata.title;
    setMeta('meta[name="description"]', { name: 'description', content: metadata.description });
    const robots = import.meta.env.MODE === 'staging' ? 'noindex,nofollow,noarchive' : metadata.robots;
    setMeta('meta[name="robots"]', { name: 'robots', content: robots });
    setCanonical(metadata.canonical);

    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Verdaxis' });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: metadata.type });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: metadata.title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: metadata.description });
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: metadata.language === 'zh' ? 'zh_CN' : 'en_SG' });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    setMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
    setMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
    setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: SOCIAL_IMAGE_ALT });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: metadata.description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
    setMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: SOCIAL_IMAGE_ALT });

    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (metadata.canonical) {
      setMeta('meta[property="og:url"]', { property: 'og:url', content: metadata.canonical });
    } else {
      ogUrl?.remove();
    }
  }, [i18n.language, pathname]);

  return null;
}
