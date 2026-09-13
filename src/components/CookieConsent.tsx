import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';

import {
  readCookiePreferences,
  subscribeCookiePreferences,
  writeCookiePreferences,
} from '../services/cookiePreferences';

const OPEN_COOKIE_SETTINGS_EVENT = 'verdaxis:open-cookie-settings';

const choiceButtonClass = 'min-h-11 min-w-0 flex-1 basis-0 rounded-md border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold leading-5 text-slate-800 transition-colors duration-150 hover:border-[#24558A] hover:text-[#24558A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24558A] focus-visible:ring-offset-2 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:text-sky-300';

export const openCookieSettings = (returnFocus?: HTMLElement) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT, { detail: returnFocus }));
  }
};

export const CookieSettingsButton: React.FC<{ variant?: 'floating' | 'footer' }> = ({
  variant = 'floating',
}) => {
  const { t } = useTranslation();
  const floating = variant === 'floating';
  return (
    <button
      type="button"
      onClick={(event) => openCookieSettings(event.currentTarget)}
      aria-label={t('cookiePreferences.settings')}
      data-cookie-settings={variant}
      className={floating
        ? 'verdaxis-cookie-settings verdaxis-cookie-settings--floating fixed bottom-4 left-4 z-[13000] flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-md transition-colors duration-150 hover:border-[#24558A] hover:text-[#24558A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24558A] focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
        : 'verdaxis-cookie-settings--footer inline-flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-400 transition-colors duration-150 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'}
    >
      <Settings2 size={16} aria-hidden="true" />
      {t('cookiePreferences.settings')}
    </button>
  );
};

interface CookieConsentBannerProps {
  error: boolean;
  onChoice: (optionalAnalytics: boolean) => void;
  focusOnOpen?: boolean;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  error,
  onChoice,
  focusOnOpen = false,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const routeLanguage = location.pathname.match(/^\/(en|zh)(?:\/|$)/i)?.[1]?.toLowerCase() ?? 'en';
  const bannerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusOnOpen) bannerRef.current?.focus();
  }, [focusOnOpen]);

  return (
    <section
      ref={bannerRef}
      tabIndex={-1}
      role="region"
      aria-labelledby="cookie-preferences-title"
      className="verdaxis-cookie-banner fixed bottom-4 left-1/2 z-[13000] max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),640px)] -translate-x-1/2 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-4 text-slate-900 shadow-xl outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:p-5"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <h2 id="cookie-preferences-title" className="text-base font-bold">
            {t('cookiePreferences.title')}
          </h2>
          <p className="max-w-[68ch] text-sm leading-6 text-slate-700 dark:text-slate-300">
            {t('cookiePreferences.description')}{' '}
            <Link
              to={`/${routeLanguage}/privacy`}
              className="font-semibold text-[#24558A] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24558A] dark:text-sky-300"
            >
              {t('cookiePreferences.privacyLink')}
            </Link>
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {t('cookiePreferences.storageError')}
          </p>
        )}
        <div className="flex flex-row gap-2">
          <button type="button" className={choiceButtonClass} onClick={() => onChoice(false)}>
            {t('cookiePreferences.reject')}
          </button>
          <button type="button" className={choiceButtonClass} onClick={() => onChoice(true)}>
            {t('cookiePreferences.accept')}
          </button>
        </div>
      </div>
    </section>
  );
};

export const CookieConsentControls: React.FC = () => {
  const [open, setOpen] = useState(() => readCookiePreferences() === null);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const synchronizeControls = () => {
      const next = readCookiePreferences();
      if (next) {
        setOpen(false);
        setStorageError(false);
      } else {
        setOpen(true);
      }
    };
    const unsubscribe = subscribeCookiePreferences(synchronizeControls);
    synchronizeControls();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const show = (event: Event) => {
      returnFocusRef.current = (event as CustomEvent<HTMLElement | undefined>).detail ?? null;
      setOpen(true);
      setFocusOnOpen(true);
      setStorageError(false);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, show);
  }, []);

  useEffect(() => {
    if (open || !returnFocusRef.current) return;
    const target = returnFocusRef.current.isConnected
      ? returnFocusRef.current
      : document.querySelector<HTMLElement>('[data-cookie-settings="floating"]');
    target?.focus();
    returnFocusRef.current = null;
    setFocusOnOpen(false);
  }, [open]);

  const saveChoice = (optionalAnalytics: boolean) => {
    const saved = writeCookiePreferences(optionalAnalytics, { window });
    if (!saved) {
      setStorageError(true);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      {open
        ? <CookieConsentBanner error={storageError} onChoice={saveChoice} focusOnOpen={focusOnOpen} />
        : <CookieSettingsButton />}
      <style>{`
        .verdaxis-cookie-banner,
        .verdaxis-cookie-settings {
          bottom: calc(1rem + env(safe-area-inset-bottom));
        }
        body:has(footer .verdaxis-cookie-settings--footer) .verdaxis-cookie-settings--floating {
          display: none;
        }
        @media (max-width: 767px) {
          body:has(.public-mobile-cta) .verdaxis-cookie-banner,
          body:has(.public-mobile-cta) .verdaxis-cookie-settings {
            bottom: calc(64px + env(safe-area-inset-bottom));
          }
          body:has(.public-mobile-cta) .verdaxis-cookie-banner {
            max-height: calc(100dvh - 80px - env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </>
  );
};
