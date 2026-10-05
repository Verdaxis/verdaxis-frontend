window.__BUILD_VERSION__ = '1774900383';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import i18n, { loadNamespace } from './i18n';
import { getPublicPageLoader } from './publicPageLoaders';
import { isKnownPublicPath } from './routeMetadata';
import './index.css';

async function preparePublicRoute(pathname: string): Promise<void> {
  if (!isKnownPublicPath(pathname)) return;

  const language = pathname.split('/')[1] === 'zh' ? 'zh' : 'en';
  const pageLoader = getPublicPageLoader(pathname);

  await i18n.changeLanguage(language);
  const namespaceLoads = [loadNamespace('public')];
  if (/\/education(?:\/|$)/.test(pathname)) {
    namespaceLoads.push(loadNamespace('education'));
  }
  await Promise.all([
    ...namespaceLoads,
    pageLoader?.(),
  ]);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

async function mountApp() {
  try {
    await preparePublicRoute(window.location.pathname);
  } catch (error) {
    console.error('[bootstrap] Failed to preload the public route.', error);
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void mountApp();
