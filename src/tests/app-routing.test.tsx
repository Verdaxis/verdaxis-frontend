import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import i18n from '../i18n';
import { AppRoutes } from '../App';
import { NotificationList } from '../components/notifications/NotificationList';

type Role = 'BUYER' | 'SUPPLIER' | 'ADMIN';

const {
  authControl,
  notificationsControl,
  listAsksPaged,
  listBidsPaged,
  listAsks,
  listBids,
  myOrders,
  deliveryPoints,
  tradeTapeList,
  tradesInitiate,
} = vi.hoisted(() => {
  const makeAuth = (
    role: 'BUYER' | 'SUPPLIER' | 'ADMIN',
    isAuthenticated = true,
    organizationId: string | undefined = 'org-1',
  ) => ({
    user: isAuthenticated
      ? {
          id: 'user-1',
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
          role,
          organization_id: organizationId,
          must_change_password: false,
        }
      : null,
    isAuthenticated,
    isLoading: false,
    isBackendUnavailable: false,
    checkAuth: () => undefined,
    login: async () => undefined,
    logout: () => undefined,
  });

  return {
    authControl: { current: makeAuth('BUYER'), makeAuth },
    notificationsControl: {
      current: {
        notifications: [] as Array<Record<string, unknown>>,
        markAsRead: () => undefined,
        markAllAsRead: () => undefined,
        unreadCount: 0,
      },
    },
    listAsksPaged: vi.fn(),
    listBidsPaged: vi.fn(),
    listAsks: vi.fn(),
    listBids: vi.fn(),
    myOrders: vi.fn(),
    deliveryPoints: vi.fn(),
    tradeTapeList: vi.fn(),
    tradesInitiate: vi.fn(),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authControl.current,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../context/TutorialContext', () => ({
  useTutorial: () => ({ start: () => undefined }),
  TutorialProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => notificationsControl.current,
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../components/GuidedTutorial', () => ({ GuidedTutorial: () => null }));
vi.mock('../components/notifications/NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('../components/LanguageSelector', () => ({ default: () => null }));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/public/DataOcean', () => ({ DataOcean: () => null }));
vi.mock('../components/ui/Pagination', () => ({ Pagination: () => null }));

vi.mock('../components/CommandCenter', () => ({
  BuyerDashboard: ({ openOrderId }: { openOrderId?: string }) => (
    <div data-testid="page-buyer-dashboard">{openOrderId ? `order:${openOrderId}` : 'no-order'}</div>
  ),
  SupplierDashboard: ({ openOrderId }: { openOrderId?: string }) => (
    <div data-testid="page-supplier-dashboard">{openOrderId ? `order:${openOrderId}` : 'no-order'}</div>
  ),
}));
vi.mock('../components/SupplierQuotes', () => ({ SupplierQuotes: () => <div data-testid="page-quotes" /> }));
vi.mock('../components/DataAnalytics', () => ({ DataAnalytics: () => <div data-testid="page-data-analytics" /> }));
vi.mock('../components/Training', () => ({ Training: () => <div data-testid="page-training" /> }));
vi.mock('../components/Settings', () => ({
  Settings: ({ viewMode }: { viewMode: string }) => <div data-testid="page-settings">{viewMode}</div>,
}));
vi.mock('../components/TradeHistoryPage', () => ({ TradeHistoryPage: () => <div data-testid="page-trades" /> }));
vi.mock('../components/ForwardCurveWorkspace', () => ({ ForwardCurveWorkspace: () => <div data-testid="page-curve" /> }));
vi.mock('../components/WatchlistPage', () => ({ WatchlistPage: () => <div data-testid="page-watchlist" /> }));
vi.mock('../components/Compliance', () => ({ Compliance: () => <div data-testid="page-compliance" /> }));
vi.mock('../components/admin/AdminDashboard', () => ({ AdminDashboard: () => <div data-testid="page-admin" /> }));
vi.mock('../components/BuyerMap', () => ({
  BuyerMap: ({ onPortSelect }: { onPortSelect: (port: { id: string; name: string }) => void }) => (
    <div data-testid="page-map">
      <button type="button" onClick={() => onPortSelect({ id: 'port-sg', name: 'Singapore' })}>
        select-singapore
      </button>
    </div>
  ),
}));

vi.mock('../hooks/useWatchlist', () => ({
  useWatchlist: () => ({
    radar: null,
    events: [],
    loading: false,
    error: null,
    trackedSliceKeys: new Set<string>(),
    pinnedOrderIds: new Set<string>(),
    nextCursor: null,
    refresh: () => undefined,
    loadMoreEvents: () => undefined,
    toggleSlice: async () => true,
    togglePin: async () => true,
    removeTarget: () => undefined,
    markEventRead: () => undefined,
  }),
}));

vi.mock('../services/api', () => ({
  api: {
    catalog: {
      deliveryPoints,
    },
    orderbook: {
      listAsksPaged,
      listBidsPaged,
      listAsks,
      listBids,
      myOrders,
    },
    trades: {
      initiate: tradesInitiate,
    },
    tradeTape: {
      list: tradeTapeList,
    },
  },
}));

const emptyListings = { items: [], total: 0, skip: 0, limit: 8 };

const LocationSpy: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
};

const NavigateButton: React.FC<{ to: string }> = ({ to }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      navigate-to-target
    </button>
  );
};

type InitialEntry = string | { pathname: string; state?: unknown };

function buildApp(initialEntry: InitialEntry, extra?: React.ReactNode) {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRoutes />
        <LocationSpy />
        {extra}
      </MemoryRouter>
    </I18nextProvider>
  );
}

function renderApp(initialEntry: InitialEntry, extra?: React.ReactNode) {
  return render(buildApp(initialEntry, extra));
}

const currentPathname = () => screen.getByTestId('location-pathname').textContent;

const dashboardPageAttr = () => document.querySelector('main')?.getAttribute('data-dashboard-page');

const setRole = (role: Role, isAuthenticated = true) => {
  authControl.current = authControl.makeAuth(role, isAuthenticated);
};

describe('app routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.__VERDAXIS_NAV_METRICS__ = [];
    setRole('BUYER');
    notificationsControl.current = {
      notifications: [],
      markAsRead: () => undefined,
      markAllAsRead: () => undefined,
      unreadCount: 0,
    };
    listAsksPaged.mockResolvedValue(emptyListings);
    listBidsPaged.mockResolvedValue(emptyListings);
    listAsks.mockResolvedValue([]);
    listBids.mockResolvedValue([]);
    myOrders.mockResolvedValue([]);
    deliveryPoints.mockResolvedValue([
      { id: 'dp-1', name: 'Singapore', region: 'Asia', is_active: true },
      { id: 'dp-2', name: 'Rotterdam', region: 'Europe', is_active: true },
    ]);
    tradeTapeList.mockResolvedValue({ items: [], total: 0, market_hours: true });
    tradesInitiate.mockResolvedValue({ status: 'PENDING_CONFIRMATION' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('route → component per viewMode', () => {
    it('renders the BUYER-viewMode component and legacy page value for each route', async () => {
      const cases: Array<[string, string, string]> = [
        ['/app/home', 'page-buyer-dashboard', 'DASHBOARD'],
        ['/app/map', 'page-map', 'MAP'],
        ['/app/curve', 'page-curve', 'FORWARD_CURVE'],
        ['/app/watchlist', 'page-watchlist', 'WATCHLISTS'],
        ['/app/analytics', 'page-data-analytics', 'DATA_ANALYTICS'],
        ['/app/trades', 'page-trades', 'TRADES'],
        ['/app/compliance', 'page-compliance', 'COMPLIANCE'],
        ['/app/training', 'page-training', 'TRAINING'],
        ['/app/settings', 'page-settings', 'SETTINGS'],
      ];
      for (const [path, marker, page] of cases) {
        const view = renderApp(path);
        expect(await screen.findByTestId(marker)).toBeTruthy();
        expect(dashboardPageAttr()).toBe(page);
        expect(sessionStorage.getItem('verdaxis_currentPage')).toBe(page);
        view.unmount();
      }
    });

    it('renders the SUPPLIER-viewMode component for shared paths', async () => {
      setRole('SUPPLIER');
      const cases: Array<[string, string, string]> = [
        ['/app/home', 'page-supplier-dashboard', 'DASHBOARD'],
        ['/app/analytics', 'page-data-analytics', 'DATA_ANALYTICS'],
        ['/app/quotes', 'page-quotes', 'QUOTES'],
        ['/app/settings', 'page-settings', 'SETTINGS'],
      ];
      for (const [path, marker, page] of cases) {
        const view = renderApp(path);
        expect(await screen.findByTestId(marker)).toBeTruthy();
        expect(dashboardPageAttr()).toBe(page);
        view.unmount();
      }
    });

    it('keeps the shared analytics component when an admin switches viewMode', async () => {
      setRole('ADMIN');
      sessionStorage.setItem('verdaxis_viewMode', 'SUPPLIER');
      const supplierView = renderApp('/app/analytics');
      expect(await screen.findByTestId('page-data-analytics')).toBeTruthy();
      supplierView.unmount();

      sessionStorage.setItem('verdaxis_viewMode', 'BUYER');
      renderApp('/app/analytics');
      expect(await screen.findByTestId('page-data-analytics')).toBeTruthy();
    });

    it('passes the viewMode through to Settings', async () => {
      setRole('SUPPLIER');
      renderApp('/app/settings');
      expect((await screen.findByTestId('page-settings')).textContent).toBe('SUPPLIER');
    });
  });

  describe('viewMode guards', () => {
    it('redirects BUYER viewMode away from /app/quotes', async () => {
      renderApp('/app/quotes');
      expect(await screen.findByTestId('page-buyer-dashboard')).toBeTruthy();
      expect(currentPathname()).toBe('/app/home');
    });

    it('redirects SUPPLIER viewMode away from /app/compliance and /app/training', async () => {
      setRole('SUPPLIER');
      for (const path of ['/app/compliance', '/app/training']) {
        const view = renderApp(path);
        expect(await screen.findByTestId('page-supplier-dashboard')).toBeTruthy();
        expect(currentPathname()).toBe('/app/home');
        view.unmount();
      }
    });
  });

  describe('redirects', () => {
    it('sends unknown /app/* paths home (there is no /app/inventory)', async () => {
      renderApp('/app/inventory');
      expect(await screen.findByTestId('page-buyer-dashboard')).toBeTruthy();
      expect(currentPathname()).toBe('/app/home');
    });

    it('restores the stored page at bare /app', async () => {
      sessionStorage.setItem('verdaxis_currentPage', 'TRAINING');
      renderApp('/app');
      expect(await screen.findByTestId('page-training')).toBeTruthy();
      expect(currentPathname()).toBe('/app/training');
    });

    it('maps the legacy ORDERBOOK value to the marketplace', async () => {
      sessionStorage.setItem('verdaxis_currentPage', 'ORDERBOOK');
      renderApp('/app');
      await waitFor(() => expect(currentPathname()).toBe('/app/marketplace'));
    });

    it('maps INVENTORY, junk, and missing values to home', async () => {
      for (const stored of ['INVENTORY', 'NOT_A_PAGE', null]) {
        if (stored === null) {
          sessionStorage.removeItem('verdaxis_currentPage');
        } else {
          sessionStorage.setItem('verdaxis_currentPage', stored);
        }
        const view = renderApp('/app');
        await waitFor(() => expect(currentPathname()).toBe('/app/home'));
        view.unmount();
      }
    });

    it('leaves the onboarding pending-tutorial flag untouched', async () => {
      localStorage.setItem('verdaxis_tutorial_pending', 'true');
      renderApp('/app');
      await waitFor(() => expect(currentPathname()).toBe('/app/home'));
      expect(localStorage.getItem('verdaxis_tutorial_pending')).toBe('true');
    });
  });

  describe('admin', () => {
    it('allows an ADMIN without an organization to open the admin dashboard', async () => {
      authControl.current = authControl.makeAuth('ADMIN', true, undefined);
      renderApp('/app/admin');
      expect(await screen.findByTestId('page-admin')).toBeTruthy();
      expect(currentPathname()).toBe('/app/admin');
    });

    it('renders the admin dashboard for ADMIN users at /app/admin', async () => {
      setRole('ADMIN');
      renderApp('/app/admin');
      expect(await screen.findByTestId('page-admin')).toBeTruthy();
      expect(dashboardPageAttr()).toBe('ADMIN');
    });

    it('redirects non-admin users home from /app/admin', async () => {
      renderApp('/app/admin');
      expect(await screen.findByTestId('page-buyer-dashboard')).toBeTruthy();
      expect(currentPathname()).toBe('/app/home');
    });

    it('redirects the legacy /admin prefix to /app/admin', async () => {
      setRole('ADMIN');
      renderApp('/admin/users');
      await waitFor(() => expect(currentPathname()).toBe('/app/admin'));
      expect(await screen.findByTestId('page-admin')).toBeTruthy();
    });
  });

  describe('marketplace slice URLs', () => {
    it('preselects the slice from a valid deep link', async () => {
      renderApp('/app/m/bio-methanol/singapore/spot');
      await waitFor(() => {
        expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({
          market_product: 'BIO_METHANOL',
          availability: 'SPOT',
          region: 'Singapore',
        }));
      });
      const chip = document.querySelector('[data-market-product="BIO_METHANOL"]');
      expect(chip?.getAttribute('aria-pressed')).toBe('true');
      expect(currentPathname()).toBe('/app/m/bio-methanol/singapore/spot');
      expect(dashboardPageAttr()).toBe('MARKETPLACE');
    });

    it('canonicalizes case-variant slice URLs in place', async () => {
      renderApp('/app/m/BIO-METHANOL/Singapore/SPOT');
      await waitFor(() => expect(currentPathname()).toBe('/app/m/bio-methanol/singapore/spot'));
    });

    it('redirects invalid slices to the generic marketplace', async () => {
      const invalidPaths = [
        '/app/m/unknown-product/singapore/spot',
        '/app/m/bio-methanol/atlantis/spot',
        '/app/m/bio-methanol/singapore/someday',
      ];
      for (const path of invalidPaths) {
        const view = renderApp(path);
        await waitFor(() => expect(currentPathname()).toBe('/app/marketplace'));
        view.unmount();
      }
    });

    it('re-syncs the marketplace on slice→slice navigation', async () => {
      renderApp(
        '/app/m/bio-methanol/singapore/spot',
        <NavigateButton to="/app/m/e-methanol/rotterdam/2026-q1" />,
      );
      await waitFor(() => {
        expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({
          market_product: 'BIO_METHANOL',
          availability: 'SPOT',
        }));
      });

      fireEvent.click(screen.getByText('navigate-to-target'));

      await waitFor(() => {
        expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({
          market_product: 'E_METHANOL',
          availability: '2026-Q1',
          delivery_point_id: 'dp-2',
        }));
      });
      expect(currentPathname()).toBe('/app/m/e-methanol/rotterdam/2026-q1');
      const chip = document.querySelector('[data-market-product="E_METHANOL"]');
      expect(chip?.getAttribute('aria-pressed')).toBe('true');
    });

    it('rewrites the slice URL when the user switches product in-page', async () => {
      renderApp('/app/m/bio-methanol/singapore/spot');
      const chip = await waitFor(() => {
        const node = document.querySelector('[data-market-product="E_METHANOL"]');
        expect(node).toBeTruthy();
        return node as HTMLElement;
      });

      fireEvent.click(chip);

      await waitFor(() => expect(currentPathname()).toBe('/app/m/e-methanol/singapore/spot'));
    });

    it('keeps the generic /app/marketplace URL stable', async () => {
      renderApp('/app/marketplace');
      const chip = await waitFor(() => {
        const node = document.querySelector('[data-market-product="E_METHANOL"]');
        expect(node).toBeTruthy();
        return node as HTMLElement;
      });

      fireEvent.click(chip);

      await waitFor(() => {
        expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({ market_product: 'E_METHANOL' }));
      });
      expect(currentPathname()).toBe('/app/marketplace');
    });
  });

  describe('map → marketplace handoff', () => {
    it('carries the selected port through router state', async () => {
      renderApp('/app/map');
      fireEvent.click(await screen.findByText('select-singapore'));

      await waitFor(() => expect(currentPathname()).toBe('/app/marketplace'));
      await waitFor(() => {
        expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({
          region: 'Singapore',
          market_product: undefined,
        }));
      });
    });
  });

  describe('notifications', () => {
    it('lands on home with the order id from a notification click', async () => {
      notificationsControl.current = {
        notifications: [{
          id: 'notif-1',
          type: 'ORDER_UPDATE',
          title: 'Trade Confirmed',
          message: 'Your order was confirmed',
          data: { order_id: 'order-42' },
          is_read: false,
          created_at: new Date().toISOString(),
        }],
        markAsRead: () => undefined,
        markAllAsRead: () => undefined,
        unreadCount: 1,
      };
      renderApp('/app/trades', <NotificationList onClose={() => undefined} />);
      expect(await screen.findByTestId('page-trades')).toBeTruthy();

      fireEvent.click(screen.getByText('Trade Confirmed'));

      await waitFor(() => expect(currentPathname()).toBe('/app/home'));
      expect((await screen.findByTestId('page-buyer-dashboard')).textContent).toBe('order:order-42');
    });
  });

  describe('sidebar', () => {
    it('renders real anchors with route hrefs', async () => {
      setRole('ADMIN');
      renderApp('/app/home');
      await screen.findByTestId('page-buyer-dashboard');

      const hrefOf = (tourId: string) => document.querySelector(`[data-tour="${tourId}"]`)?.getAttribute('href');
      expect(hrefOf('nav-DASHBOARD')).toBe('/app/home');
      expect(hrefOf('nav-MAP')).toBe('/app/map');
      expect(hrefOf('nav-MARKETPLACE')).toBe('/app/marketplace');
      expect(hrefOf('nav-FORWARD_CURVE')).toBe('/app/curve');
      expect(hrefOf('nav-WATCHLISTS')).toBe('/app/watchlist');
      expect(hrefOf('nav-ANALYTICS')).toBe('/app/analytics');
      expect(hrefOf('nav-TRADES')).toBe('/app/trades');

      const anchors = Array.from(document.querySelectorAll('aside a'));
      const hrefs = anchors.map((anchor) => anchor.getAttribute('href'));
      expect(hrefs).toContain('/app/settings');
      expect(hrefs).toContain('/app/admin');
    });

    it('closes the mobile drawer when a nav link is clicked', async () => {
      renderApp('/app/home');
      await screen.findByTestId('page-buyer-dashboard');

      fireEvent.click(document.querySelector('[data-tour="mobile-menu"]') as HTMLElement);
      const aside = document.querySelector('aside') as HTMLElement;
      expect(aside.className).not.toContain('-translate-x-full');

      fireEvent.click(document.querySelector('[data-tour="nav-TRADES"]') as HTMLElement);
      expect(await screen.findByTestId('page-trades')).toBeTruthy();
      expect(aside.className).toContain('-translate-x-full');
    });

    it('records nav metrics on sidebar navigation', async () => {
      renderApp('/app/home');
      await screen.findByTestId('page-buyer-dashboard');

      fireEvent.click(document.querySelector('[data-tour="nav-TRADES"]') as HTMLElement);
      await screen.findByTestId('page-trades');

      await waitFor(() => {
        expect(window.__VERDAXIS_NAV_METRICS__).toEqual(expect.arrayContaining([
          expect.objectContaining({ fromPage: 'DASHBOARD', toPage: 'TRADES', viewMode: 'BUYER' }),
        ]));
      });
      expect(sessionStorage.getItem('verdaxis_currentPage')).toBe('TRADES');
    });
  });

  describe('login redirect', () => {
    it('returns to the denied deep link after authentication (auto-redirect site)', async () => {
      setRole('BUYER', false);
      const entry = '/app/m/bio-methanol/singapore/spot';
      const { rerender } = renderApp(entry);
      await waitFor(() => expect(currentPathname()).toBe('/login'));

      setRole('BUYER');
      // Fresh (structurally identical) elements so React re-renders the
      // tree without remounting the router.
      rerender(buildApp(entry));

      await waitFor(() => expect(currentPathname()).toBe('/app/m/bio-methanol/singapore/spot'));
      await waitFor(() => {
        expect(listAsksPaged).toHaveBeenCalledWith(expect.objectContaining({
          market_product: 'BIO_METHANOL',
          availability: 'SPOT',
        }));
      });
    });

    it('returns to the denied page after form submit (post-submit site)', async () => {
      setRole('BUYER', false);
      authControl.current.login = async () => {
        setRole('BUYER');
      };
      vi.stubGlobal('fetch', vi.fn(async () => new Response(
        JSON.stringify({ access_token: 'token-1' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )));

      renderApp('/app/curve');
      await waitFor(() => expect(currentPathname()).toBe('/login'));

      const emailInput = await waitFor(() => {
        const node = document.querySelector('input[type="email"]');
        expect(node).toBeTruthy();
        return node as HTMLInputElement;
      });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(document.querySelector('input[type="password"]') as HTMLInputElement, {
        target: { value: 'secret' },
      });
      fireEvent.submit(document.querySelector('form') as HTMLFormElement);

      await waitFor(() => expect(currentPathname()).toBe('/app/curve'));
      expect(await screen.findByTestId('page-curve')).toBeTruthy();
    });
  });
});
