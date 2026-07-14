import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import i18n from '../i18n';
import { analytics, type AnalyticsLanguage } from '../services/analytics';

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => { analytics.initialize(); }, []);
  useEffect(() => { analytics.trackPage(location.pathname); }, [location.pathname]);
  useEffect(() => {
    if (!user) return;
    analytics.identify({
      userId: user.id,
      role: user.role,
      organizationType: user.organization_type,
      language: i18n.language.split('-')[0] as AnalyticsLanguage,
    });
  }, [user]);

  return children;
};
