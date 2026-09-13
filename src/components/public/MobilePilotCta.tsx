import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useLocalePath } from '../../hooks/useLocalePath';
import { isKnownPublicPath } from '../../routeMetadata';

const CTA_EXCLUDED_ROUTES = new Set(['pilot', 'governance', 'privacy', 'terms']);

export const shouldShowMobilePilotCta = (pathname: string): boolean => {
  if (!isKnownPublicPath(pathname)) return false;
  const routeKey = pathname.split('/').filter(Boolean).slice(1).join('/');
  return !CTA_EXCLUDED_ROUTES.has(routeKey);
};

export const MobilePilotCta: React.FC = () => {
  const { pathname } = useLocation();
  const localePath = useLocalePath();
  const { t } = useTranslation();

  if (!shouldShowMobilePilotCta(pathname)) return null;

  return (
    <aside className="public-mobile-cta" aria-label={t('btn.applyPilot')}>
      <Link to={localePath('/pilot')}>
        {t('btn.applyPilot')}
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
      <style>{`
        .public-mobile-cta {
          display: none;
        }

        @media (max-width: 767px) {
          .public-mobile-cta {
            position: fixed;
            right: 0;
            bottom: 0;
            left: 0;
            z-index: 45;
            display: block;
            padding: 10px max(16px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
            background: #F8FAFC;
            box-shadow: 0 -1px 0 #CBD5E1;
          }

          .public-mobile-cta a {
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 8px;
            background: #0F172A;
            color: #F8FAFC;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
          }

          .public-mobile-cta a:focus-visible {
            outline: 3px solid #5DADE2;
            outline-offset: 2px;
          }
        }
      `}</style>
    </aside>
  );
};
