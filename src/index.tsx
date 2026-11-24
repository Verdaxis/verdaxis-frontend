window.__BUILD_VERSION__ = '1774900383';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import i18n, { loadNamespace, resourceLanguage } from './i18n';
import { getPublicPageLoader, type PreparedPublicPage } from './publicPageLoaders';
import { isKnownPublicPath } from './routeMetadata';
import './index.css';

async function preparePublicRoute(pathname: string): Promise<PreparedPublicPage | undefined> {
  const language = pathname.split('/')[1] === 'zh' ? 'zh' : 'en';
  const pageLoader = getPublicPageLoader(pathname);

  const namespaceLoads = [loadNamespace('public', language)];
  if (/\/education(?:\/|$)/.test(pathname)) {
    namespaceLoads.push(loadNamespace('education', language));
  }
  const [page] = await Promise.all([
    pageLoader?.(),
    Promise.all(namespaceLoads),
    i18n.changeLanguage(language),
  ]);
  return page ? { pathname, Component: page.default } : undefined;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

async function mountApp(container: HTMLElement) {
  let initialPublicPage: PreparedPublicPage | undefined;
  try {
    const pathname = window.location.pathname;
    if (isKnownPublicPath(pathname)) {
      initialPublicPage = await preparePublicRoute(pathname);
    } else {
      await i18n.changeLanguage(resourceLanguage());
    }
  } catch (error) {
    console.error('[bootstrap] Failed to preload the public route.', error);
  }

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App initialPublicPage={initialPublicPage} />
    </React.StrictMode>
  );
}

void mountApp(rootElement);
