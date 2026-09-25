import { useEffect, useLayoutEffect } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CookieConsentControls } from '../components/CookieConsent';
import { Sidebar } from '../components/layout/Sidebar';
import { AnalyticsProvider } from '../components/AnalyticsProvider';
import { analytics } from '../services/analytics';
import { COOKIE_PREFERENCES_STORAGE_KEY, writeCookiePreferences } from '../services/cookiePreferences';

describe('cookie consent controls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    act(() => { writeCookiePreferences(false, { window }); });
    localStorage.clear();
  });

  it.each([false, true])('keeps app settings reachable with a sidebar consent control (collapsed=%s)', async (collapsed) => {
    act(() => { writeCookiePreferences(false, { window }); });
    const { container } = render(
      <MemoryRouter initialEntries={['/app/home']}>
        <Sidebar viewMode="BUYER" currentPage="DASHBOARD" onNavigate={vi.fn()}
          isCollapsed={collapsed} onToggleCollapse={vi.fn()} isMobileOpen={false} onMobileClose={vi.fn()} />
        <CookieConsentControls />
      </MemoryRouter>,
    );
    const sidebar = within(container.querySelector('aside')!);
    expect(sidebar.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/app/settings');
    const cookieSettings = sidebar.getByRole('button', { name: 'Cookie settings' });
    expect(cookieSettings.getAttribute('data-cookie-settings')).toBe('sidebar');
    expect(cookieSettings.className).not.toContain('fixed');
    expect(cookieSettings.querySelector('span')?.className).toBe(collapsed ? 'sr-only' : '');
    fireEvent.click(cookieSettings);
    expect(screen.getByRole('region', { name: 'Privacy and analytics choices' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    await waitFor(() => expect(document.activeElement).toBe(cookieSettings));
  });

  it('offers equally prominent accept and reject choices and can reopen settings', () => {
    render(<MemoryRouter initialEntries={['/zh/']}><CookieConsentControls /></MemoryRouter>);

    const accept = screen.getByRole('button', { name: 'Allow optional analytics' });
    const reject = screen.getByRole('button', { name: 'Essential only' });
    expect(accept.className).toBe(reject.className);
    expect(accept.parentElement?.className).toContain('flex-row');
    expect(accept.parentElement?.className).not.toContain('flex-wrap');
    expect(accept.className).toContain('min-w-0');
    expect(screen.getByRole('region', { name: 'Privacy and analytics choices' }).className).toContain('z-[13000]');
    expect(screen.getByRole('link', { name: 'Read our Privacy Policy.' }).getAttribute('href')).toBe('/zh/privacy');

    fireEvent.click(accept);
    expect(screen.queryByRole('region', { name: 'Privacy and analytics choices' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(COOKIE_PREFERENCES_STORAGE_KEY) ?? '{}')).toEqual({
      version: 2,
      optionalAnalytics: true,
    });

    const settings = screen.getByRole('button', { name: 'Cookie settings' });
    expect(settings.className).toContain('z-[13000]');
    fireEvent.click(settings);
    expect(screen.getByRole('region', { name: 'Privacy and analytics choices' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cookie settings' }));
  });

  it('explains why a prior anonymous-analytics choice needs fresh consent', () => {
    localStorage.setItem(COOKIE_PREFERENCES_STORAGE_KEY, JSON.stringify({
      version: 1,
      optionalAnalytics: true,
    }));

    render(<MemoryRouter><CookieConsentControls /></MemoryRouter>);

    expect(screen.getByText(/earlier choice covered anonymous analytics only/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Allow optional analytics' })).toBeTruthy();
  });
});

describe('AnalyticsProvider consent synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts after opt-in and stops after a same-tab withdrawal', async () => {
    act(() => { writeCookiePreferences(true, { window }); });
    const setConsent = vi.spyOn(analytics, 'setConsent');
    const initialize = vi.spyOn(analytics, 'initialize');
    const trackPage = vi.spyOn(analytics, 'trackPage');

    render(
      <MemoryRouter initialEntries={['/en/']}>
        <AnalyticsProvider><main>Content</main></AnalyticsProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(setConsent).toHaveBeenCalledWith(true));
    expect(initialize).toHaveBeenCalled();
    expect(trackPage).toHaveBeenCalledWith('/en/');

    const dispatch = vi.fn();
    (window as Window & { umami?: { track: typeof dispatch } }).umami = { track: dispatch };
    act(() => { writeCookiePreferences(false, { window }); });
    expect(setConsent).toHaveBeenLastCalledWith(false);
    analytics.track('login_submitted');
    expect(dispatch).not.toHaveBeenCalled();

    act(() => { writeCookiePreferences(true, { window }); });
    await waitFor(() => expect(setConsent).toHaveBeenLastCalledWith(true));
    dispatch.mockClear();
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(setConsent).toHaveBeenLastCalledWith(false);
    analytics.track('login_submitted');
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Privacy and analytics choices' })).toBeTruthy();
  });

  it('reconciles stale adapter consent before descendant mount events', () => {
    const dispatch = vi.fn();
    const consentAtEffect: boolean[] = [];
    (window as Window & { umami?: { track: typeof dispatch } }).umami = { track: dispatch };
    analytics.setConsent(true);
    localStorage.clear();

    const TrackingChild = () => {
      useLayoutEffect(() => {
        consentAtEffect.push(analytics.hasConsent());
        analytics.track('login_submitted');
      }, []);
      return null;
    };

    render(
      <MemoryRouter>
        <AnalyticsProvider><TrackingChild /></AnalyticsProvider>
      </MemoryRouter>,
    );

    expect(dispatch).not.toHaveBeenCalled();
    expect(consentAtEffect).toEqual([false]);
    expect(analytics.hasConsent()).toBe(false);
  });

  it('allows descendant mount events after a returning opt-in is reconciled', () => {
    act(() => { writeCookiePreferences(true, { window }); });
    const consentAtEffect: boolean[] = [];

    const TrackingChild = () => {
      useEffect(() => {
        consentAtEffect.push(analytics.hasConsent());
        analytics.track('login_submitted');
      }, []);
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AnalyticsProvider><TrackingChild /></AnalyticsProvider>
      </MemoryRouter>,
    );

    expect(consentAtEffect).toEqual([true]);
  });

  it('immediately disables tracking when a withdrawn choice cannot be saved', async () => {
    act(() => { writeCookiePreferences(true, { window }); });
    const setConsent = vi.spyOn(analytics, 'setConsent');
    render(
      <MemoryRouter>
        <AnalyticsProvider><main>Content</main></AnalyticsProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(setConsent).toHaveBeenCalledWith(true));
    fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }));

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));

    expect(setConsent).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('alert').textContent).toContain('Optional analytics stays off');
    expect(screen.getByRole('region', { name: 'Privacy and analytics choices' })).toBeTruthy();
    setItem.mockRestore();
  });
});
