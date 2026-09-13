import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analytics';
import { readCookiePreferences, subscribeCookiePreferences } from '../services/cookiePreferences';
import { CookieConsentControls } from './CookieConsent';

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [optionalAnalytics, setOptionalAnalytics] = useState(
    () => readCookiePreferences()?.optionalAnalytics === true,
  );

  useLayoutEffect(() => {
    const synchronizeConsent = () => {
      const granted = readCookiePreferences()?.optionalAnalytics === true;
      analytics.setConsent(granted);
      setOptionalAnalytics(granted);
    };
    const unsubscribe = subscribeCookiePreferences(synchronizeConsent);
    synchronizeConsent();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!optionalAnalytics) return;
    analytics.initialize();
    analytics.trackPage(location.pathname);
  }, [location.pathname, optionalAnalytics]);

  return <>{children}<CookieConsentControls /></>;
};
