import React, { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { activity, activityPageFromPath } from '../services/activityTracking';

export const ActivityTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  useLayoutEffect(() => {
    activity.setSession(user?.id ?? null);
    const clearOnLogout = () => activity.setSession(null);
    window.addEventListener('verdaxis:auth-logout', clearOnLogout);
    return () => {
      window.removeEventListener('verdaxis:auth-logout', clearOnLogout);
      activity.clear();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const page = activityPageFromPath(location.pathname);
    if (page) activity.trackPage(page);
  }, [location.pathname, user]);

  return <>{children}</>;
};
