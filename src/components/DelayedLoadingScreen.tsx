import React, { useEffect, useState } from 'react';
import { LoadingScreen } from './LoadingScreen';

/**
 * The branded oil-drop screen, kept only for the moments that gate the whole
 * app: the auth boot check and the assisted-workspace restore. Both are
 * usually fast, so the mark waits `delayMs` before appearing — a fast load
 * shows the plain background with no flash of loading UI.
 */
export const DelayedLoadingScreen: React.FC<{
  fullScreen?: boolean;
  label?: string;
  /** How long to stay invisible before showing the loading screen. */
  delayMs?: number;
}> = ({ fullScreen = false, label, delayMs = 300 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return <LoadingScreen fullScreen={fullScreen} label={label} />;
};
