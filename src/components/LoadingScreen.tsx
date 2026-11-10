import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingScreenProps {
  fullScreen?: boolean;
  label?: string;
  /**
   * Stay invisible for this many ms before showing. Fast loads then show the
   * plain background with no flash of loading UI.
   */
  delayMs?: number;
}

/**
 * The branded oil-drop screen. Kept only for the moments that gate the whole
 * app (auth boot check, assisted-workspace restore); everything else shows a
 * layout skeleton instead.
 */
export function LoadingScreen({ fullScreen = false, label, delayMs = 0 }: LoadingScreenProps) {
  // Common translations are bundled at startup, so a Suspense fallback cannot suspend.
  const { t } = useTranslation('common', { useSuspense: false });
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (visible) return;
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [visible, delayMs]);

  if (!visible) return null;

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
