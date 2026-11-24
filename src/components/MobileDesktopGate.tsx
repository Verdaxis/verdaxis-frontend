import React, { Suspense, useEffect, useState } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';

// Loaded only on small screens, so desktop and landing pages skip its code and styles.
const MobileGateScreen = lazyWithRetry(() => import('./MobileGateScreen'));

interface MobileDesktopGateProps {
  children: React.ReactNode;
}

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export const MobileDesktopGate: React.FC<MobileDesktopGateProps> = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_MEDIA_QUERY).matches);

  useEffect(() => {
    const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const updateViewport = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    setIsDesktop(desktopMedia.matches);
    desktopMedia.addEventListener('change', updateViewport);
    return () => desktopMedia.removeEventListener('change', updateViewport);
  }, []);

  if (isDesktop) {
    return <div className="desktop-only-content">{children}</div>;
  }

  return (
    <Suspense fallback={null}>
      <MobileGateScreen />
    </Suspense>
  );
};
