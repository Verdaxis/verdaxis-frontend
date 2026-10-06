window.__BUILD_VERSION__ = '1774900383';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import i18n, { loadNamespace } from './i18n';
import { getPublicPageLoader, type PreparedPublicPage } from './publicPageLoaders';
import { isKnownPublicPath } from './routeMetadata';
import './index.css';

async function preparePublicRoute(pathname: string): Promise<PreparedPublicPage | undefined> {
  if (!isKnownPublicPath(pathname)) return;

  const language = pathname.split('/')[1] === 'zh' ? 'zh' : 'en';
  const pageLoader = getPublicPageLoader(pathname);

  await i18n.changeLanguage(language);
  const namespaceLoads = [loadNamespace('public')];
  if (/\/education(?:\/|$)/.test(pathname)) {
    namespaceLoads.push(loadNamespace('education'));
  }
  const [page] = await Promise.all([
    pageLoader?.(),
    Promise.all(namespaceLoads),
  ]);
  return page ? { pathname, Component: page.default } : undefined;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

async function mountApp() {
  let initialPublicPage: PreparedPublicPage | undefined;
  try {
    initialPublicPage = await preparePublicRoute(window.location.pathname);
  } catch (error) {
    console.error('[bootstrap] Failed to preload the public route.', error);
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App initialPublicPage={initialPublicPage} />
    </React.StrictMode>
  );
}

void mountApp();
