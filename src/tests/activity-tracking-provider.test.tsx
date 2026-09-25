import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null },
  activity: {
    setSession: vi.fn(),
    trackPage: vi.fn(),
    clear: vi.fn(),
  },
  activityPageFromPath: vi.fn(() => 'home'),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../services/activityTracking', () => ({
  activity: mocks.activity,
  activityPageFromPath: mocks.activityPageFromPath,
}));

import { ActivityTrackingProvider } from '../components/ActivityTrackingProvider';

describe('ActivityTrackingProvider', () => {
  beforeEach(() => {
    mocks.auth.user = { id: 'user-1' };
    mocks.activity.setSession.mockReset();
    mocks.activity.trackPage.mockReset();
    mocks.activity.clear.mockReset();
    mocks.activityPageFromPath.mockClear();
    localStorage.clear();
  });

  it.each(['missing', 'rejected'])('tracks a signed-in page with a %s anonymous preference', (preference) => {
    if (preference === 'rejected') {
      localStorage.setItem('verdaxis:cookie-preferences', JSON.stringify({ version: 1, optionalAnalytics: false }));
    }

    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <ActivityTrackingProvider><span>content</span></ActivityTrackingProvider>
      </MemoryRouter>,
    );

    expect(mocks.activity.setSession).toHaveBeenCalledWith('user-1');
    expect(mocks.activity.trackPage).toHaveBeenCalledWith('home');
  });

  it('does not track a page while signed out', () => {
    mocks.auth.user = null;

    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <ActivityTrackingProvider><span>content</span></ActivityTrackingProvider>
      </MemoryRouter>,
    );

    expect(mocks.activity.setSession).toHaveBeenCalledWith(null);
    expect(mocks.activity.trackPage).not.toHaveBeenCalled();
  });
});
