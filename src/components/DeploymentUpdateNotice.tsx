import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ENTRY_ASSET_PATTERN = /\/assets\/index-[^/"']+\.js$/;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

const entryAssetPath = (documentValue: Document): string | null => {
  const scripts = Array.from(documentValue.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'));
  const entry = scripts.find((script) => {
    try {
      return ENTRY_ASSET_PATTERN.test(new URL(script.src, window.location.origin).pathname);
    } catch {
      return false;
    }
  });
  return entry ? new URL(entry.src, window.location.origin).pathname : null;
};

export const deployedEntryAssetChanged = async (
  currentDocument: Document,
  signal?: AbortSignal,
): Promise<boolean> => {
  const currentEntry = entryAssetPath(currentDocument);
  if (!currentEntry) return false;

  const response = await fetch(`/?release-check=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });
  if (!response.ok) return false;

  const latestDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
  const latestEntry = entryAssetPath(latestDocument);
  return Boolean(latestEntry && latestEntry !== currentEntry);
};

export const DeploymentUpdateNotice: React.FC = () => {
  const { t } = useTranslation('common');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return undefined;

    let controller: AbortController | null = null;
    const check = () => {
      controller?.abort();
      controller = new AbortController();
      void deployedEntryAssetChanged(document, controller.signal)
        .then((changed) => {
          if (changed) setUpdateAvailable(true);
        })
        .catch(() => undefined);
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', checkWhenVisible);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[300] flex w-[min(calc(100vw-2rem),520px)] -translate-x-1/2 items-center justify-between gap-4 rounded-lg border border-amber-300 bg-white px-4 py-3 text-slate-900 shadow-2xl dark:border-amber-700 dark:bg-slate-900 dark:text-white"
    >
      <div className="min-w-0">
        <p className="text-sm font-bold">{t('deploymentUpdate.title')}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">{t('deploymentUpdate.message')}</p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex shrink-0 items-center gap-2 rounded-lg bg-verdaxis px-3 py-2 text-sm font-bold text-white hover:bg-verdaxis/90"
      >
        <RefreshCw size={15} aria-hidden="true" />
        {t('deploymentUpdate.refresh')}
      </button>
    </div>
  );
};
