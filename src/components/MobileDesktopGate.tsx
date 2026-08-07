import React from 'react';
import { Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileDesktopGateProps {
  children: React.ReactNode;
}

export const MobileDesktopGate: React.FC<MobileDesktopGateProps> = ({ children }) => {
  const { t } = useTranslation('common');

  return (
    <>
      <div className="desktop-only-content">
        {children}
      </div>
      <div className="mobile-desktop-gate" aria-live="polite">
        <div className="mobile-desktop-gate__orb mobile-desktop-gate__orb--blue" />
        <div className="mobile-desktop-gate__orb mobile-desktop-gate__orb--green" />

        <svg
          className="mobile-desktop-gate__wave"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,75 1440,60 L1440,120 L0,120 Z"
            fill="rgba(93,173,226,0.06)"
          />
          <path
            d="M0,80 C320,30 640,110 960,60 C1200,20 1360,90 1440,70 L1440,120 L0,120 Z"
            fill="rgba(76,175,80,0.05)"
          />
        </svg>

        <div className="mobile-desktop-gate__content">
          <img
            src="/verdaxis-logo-words-right.png"
            alt="Verdaxis"
            className="mobile-desktop-gate__logo"
          />
          <div className="mobile-desktop-gate__divider" />
          <Monitor className="mobile-desktop-gate__icon" aria-hidden="true" />
          <h1 className="mobile-desktop-gate__heading">{t('mobileGate.heading')}</h1>
          <p className="mobile-desktop-gate__body">
            {t('mobileGate.bodyLine1')}
            <br />
            {t('mobileGate.bodyLine2')}
          </p>
          <div className="mobile-desktop-gate__pill">
            <span className="mobile-desktop-gate__pill-dot" />
            {t('mobileGate.platform')}
          </div>
        </div>
      </div>
    </>
  );
};
