import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { activity, activityPageFromPath } from '../services/activityTracking';
import { readCookiePreferences, subscribeCookiePreferences } from '../services/cookiePreferences';

export const ActivityTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [consentGranted, setConsentGranted] = useState(
    () => readCookiePreferences()?.optionalAnalytics === true,
  );

  useLayoutEffect(() => {
    const synchronize = () => {
      const granted = readCookiePreferences()?.optionalAnalytics === true;
      activity.setSession(user?.id ?? null, granted);
      setConsentGranted(granted);
    };
    const unsubscribe = subscribeCookiePreferences(synchronize);
    const clearOnLogout = () => activity.setSession(null, false);
    window.addEventListener('verdaxis:auth-logout', clearOnLogout);
    synchronize();
    return () => {
      unsubscribe();
      window.removeEventListener('verdaxis:auth-logout', clearOnLogout);
      activity.clear();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !consentGranted) return;
    const page = activityPageFromPath(location.pathname);
    if (page) activity.trackPage(page);
  }, [consentGranted, location.pathname, user]);

  return <>{children}</>;
};
