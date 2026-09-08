import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingScreenProps {
  fullScreen?: boolean;
  label?: string;
}

export function LoadingScreen({ fullScreen = false, label }: LoadingScreenProps) {
  // Common translations are bundled at startup, so a Suspense fallback cannot suspend.
  const { t } = useTranslation('common', { useSuspense: false });

  return (
    <div
      className={`loading-screen${fullScreen ? ' loading-screen--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
    >
      <img className="loading-screen__mark" src="/loading-fuel.svg" width="96" height="112" alt="" aria-hidden="true" />
      <p className="loading-screen__label">{label ?? t('loading')}</p>
    </div>
  );
}
