import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import { MobilePilotCta, shouldShowMobilePilotCta } from './MobilePilotCta';

export const PublicLayout: React.FC = () => {
  const { pathname } = useLocation();
  const lenisRef = useRef<Lenis | null>(null);
  const showMobileCta = shouldShowMobilePilotCta(pathname);

  // Override body overflow-hidden that the app layout sets + init Lenis
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => {
        document.body.style.overflow = '';
        document.body.style.height = '';
      };
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;
    let animationFrameId = 0;

    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      lenisRef.current = null;
      document.body.style.overflow = '';
      document.body.style.height = '';
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
