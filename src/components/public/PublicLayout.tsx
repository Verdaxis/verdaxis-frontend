import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import { MobilePilotCta, shouldShowMobilePilotCta } from './MobilePilotCta';

export const PublicLayout: React.FC = () => {
  const { pathname } = useLocation();
  const showMobileCta = shouldShowMobilePilotCta(pathname);

  // Override body overflow-hidden that the app layout sets + init Lenis
  useEffect(() => {
    const { style } = document.body;
    const { overflow, height } = style;
    style.overflow = 'auto';
    style.height = 'auto';

    let disposed = false;
    let stopSmoothScroll: (() => void) | undefined;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void import('lenis').then(({ default: Lenis }) => {
        if (disposed) return;

        const lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          touchMultiplier: 2,
        });
        function raf(time: number) {
          lenis.raf(time);
          animationFrameId = window.requestAnimationFrame(raf);
        }
        let animationFrameId = window.requestAnimationFrame(raf);
        stopSmoothScroll = () => {
          window.cancelAnimationFrame(animationFrameId);
          lenis.destroy();
        };
      }).catch(() => {
        // Native scrolling stays available if the optional chunk fails.
      });
    }

    return () => {
      disposed = true;
      stopSmoothScroll?.();
      style.overflow = overflow;
      style.height = height;
    };
  }, []);

  return (
    <div
      className={showMobileCta ? 'public-layout-with-mobile-cta' : undefined}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F8FAFC',
      }}
    >
      <PublicNav />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <PublicFooter />
      <MobilePilotCta />
      <style>{`
        @media (max-width: 767px) {
          .public-layout-with-mobile-cta {
            padding-bottom: calc(64px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  );
};
