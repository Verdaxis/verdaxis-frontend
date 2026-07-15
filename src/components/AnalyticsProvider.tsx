import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analytics';

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  useEffect(() => { analytics.initialize(); }, []);
  useEffect(() => { analytics.trackPage(location.pathname); }, [location.pathname]);

  return children;
};
