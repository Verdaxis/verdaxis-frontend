import React from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({
  confirmTrade: vi.fn(),
  myTrades: vi.fn(),
  notifications: [] as Array<Record<string, unknown>>,
}));

vi.mock('../services/api', () => ({
  api: { trades: { confirm: controls.confirmTrade, myTrades: controls.myTrades } },
}));
vi.mock('../hooks/useWatchlist', () => ({
  useWatchlist: () => ({ radar: null, events: [], loading: false, error: null }),
}));
vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ isActive: false }),
}));
vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: controls.notifications,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'BUYER' } }),
}));
vi.mock('../components/OrderPlaceModal', () => ({
  OrderPlaceModal: ({ isOpen, side }: { isOpen: boolean; side: string }) => isOpen
    ? <div role="dialog" aria-label={`order-${side}`} />
    : null,
}));
vi.mock('../components/NeedsAttentionFeed', () => ({
  NeedsAttentionFeed: ({ onConfirmTrade }: { onConfirmTrade?: (id: string) => void }) => (
    <button onClick={() => onConfirmTrade?.('trade-1')}>trigger trade confirmation</button>
  ),
}));
vi.mock('../components/watchlist/MarketRadarPanel', () => ({ MarketRadarPanel: () => null }));
vi.mock('../components/SupplierDemandFeed', () => ({ SupplierDemandFeed: () => null }));

import i18n, { loadNamespace } from '../i18n';
import { CommandCenter } from '../components/CommandCenter';
import LanguageSelector from '../components/LanguageSelector';
import { NotificationList } from '../components/notifications/NotificationList';
import { PublicNav } from '../components/public/PublicNav';
import { ToastProvider } from '../components/Toast';
import { VesselDetailModal } from '../components/fleet/VesselDetailModal';
import { InvitePage } from '../pages/InvitePage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import { localizedAuthError } from '../pages/authApiError';
import { renderWithProviders } from './test-utils';

const changeLanguage = async (language: 'en' | 'zh') => {
  await act(async () => { await i18n.changeLanguage(language); });
};

describe('authenticated Chinese i18n contracts', () => {
  beforeEach(() => {
    controls.confirmTrade.mockReset().mockResolvedValue(undefined);
    controls.myTrades.mockReset().mockResolvedValue([]);
    controls.notifications = [];
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await changeLanguage('en');
  });

  it('keeps Command Center action copy aligned with each action', async () => {
    await loadNamespace('dashboard');
    await changeLanguage('zh');
    expect(i18n.t('commandCenter.recommendedMatches', { ns: 'common' })).toBe('推荐匹配');
    const navigateBuyer = vi.fn();
    renderWithProviders(<CommandCenter viewMode="BUYER" onNavigate={navigateBuyer} />);

    const postBid = await screen.findByRole('button', { name: /发布买盘.*按您的价格采购绿色燃料/ });
    fireEvent.click(postBid);
    expect(screen.getByRole('dialog', { name: 'order-BID' })).toBeTruthy();

    cleanup();
    const navigateSupplier = vi.fn();
    renderWithProviders(<CommandCenter viewMode="SUPPLIER" onNavigate={navigateSupplier} />);
    fireEvent.click(await screen.findByRole('button', { name: /浏览需求.*查看买方的有效买盘/ }));
    expect(navigateSupplier).toHaveBeenCalledWith('MARKETPLACE');
  });

  it('shows Cancel while pending and only Close after a Command Center result', async () => {
    await loadNamespace('dashboard');
    await changeLanguage('zh');
    renderWithProviders(<CommandCenter viewMode="BUYER" onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'trigger trade confirmation' }));
    expect(screen.getByRole('button', { name: '取消' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    await screen.findByRole('heading', { name: '交易已确认' });
    const resultDialog = screen.getByRole('dialog');

    expect(within(resultDialog).queryByRole('button', { name: '取消' })).toBeNull();
    expect(within(resultDialog).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(within(resultDialog).getByRole('button', { name: '关闭' }));
    expect(screen.queryByRole('heading', { name: '交易已确认' })).toBeNull();
  });

  it('localizes verification choices and known auth conflicts safely', async () => {
    await Promise.all([loadNamespace('auth'), loadNamespace('admin')]);
    await changeLanguage('zh');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ email: 'buyer@example.test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?token=valid' });

    expect(await screen.findByRole('button', { name: /燃料买方/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /燃料供应商/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /金融机构／其他/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: '继续' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '跳过' })).toBeTruthy();

    const t = i18n.getFixedT('zh', 'auth');
    expect(localizedAuthError({ detail: 'Email already registered' }, t, 'register.error.failed', 'test'))
      .toBe('此邮箱对应的账户已存在。');
    expect(localizedAuthError({ detail: { code: 'KYC_MEMBERSHIP_CHANGED' } }, t, 'kyc.error.failed', 'test'))
      .toBe('提交期间机构成员关系已更改，请重新提交。');
    expect(localizedAuthError({ detail: 'unknown backend prose' }, t, 'register.error.failed', 'test'))
      .toBe(t('register.error.failed'));
    const organizationTypes = {
      SHIPPING_LINE: '船东',
      SHIP_MANAGER: '船舶管理公司',
      FUEL_BUYER: '燃料买方',
      FUEL_SUPPLIER: '燃料供应商',
      BUNKER_BROKER: '船用燃料经纪商',
      PORT_AUTHORITY: '港口管理机构',
      FUEL_TRADER: '燃料贸易商',
      CHARTERER: '承租人',
      FINANCIER: '金融机构',
      INSURER: '保险机构',
      INDUSTRY_ASSOC: '行业协会',
    } as const;
    for (const [type, label] of Object.entries(organizationTypes)) {
      expect(t(`invite.organizationType.${type}`)).toBe(label);
      expect(i18n.t(`users.organizationType.${type}`, { ns: 'admin' })).toBe(label);
    }
    const examplePlaceholders = {
      'register.firstNamePlaceholder': '小明',
      'register.lastNamePlaceholder': '王',
      'onboarding.firstNamePlaceholder': '小明',
      'onboarding.lastNamePlaceholder': '王',
      'createOrg.orgNamePlaceholder': '华海航运有限公司',
    } as const;
    for (const [key, value] of Object.entries(examplePlaceholders)) {
      expect(t(key)).toBe(value);
    }
  });

  it('does not expose an unknown invitation organization enum in Chinese', async () => {
    await loadNamespace('auth');
    await changeLanguage('zh');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      valid: true,
      organization_name: 'Future Fuels Ltd.',
      organization_type: 'FUTURE_ORG',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    renderWithProviders(<InvitePage />, { route: '/invite/future-code', path: '/invite/:code' });

    expect(await screen.findByText('其他机构类型')).toBeTruthy();
    expect(screen.queryByText('FUTURE_ORG')).toBeNull();
  });

  it('labels every backend notification type without exposing backend prose in Chinese', async () => {
    await changeLanguage('zh');
    const expected = {
      SYSTEM: '系统通知',
      ORDER_UPDATE: '订单更新',
      DIRECT_ORDER: '直接订单',
      DIRECT_ORDER_OFFER: '直接订单报价',
      USER_STATUS: '账户状态',
      TRADE_INITIATED: '交易已发起',
      TRADE_CONFIRMED: '交易已确认',
      TRADE_DECLINED: '交易已拒绝',
      TRADE_DELIVERED: '交易已交付',
      TRADE_PAID: '交易已付款',
      MATCH_SUGGESTION: '匹配建议',
      NEGOTIATION_RECEIVED: '收到协商请求',
      NEGOTIATION_COUNTERED: '收到还价',
      NEGOTIATION_ACCEPTED: '协商已接受',
      NEGOTIATION_DECLINED: '协商已拒绝',
    } as const;
    for (const [type, label] of Object.entries(expected)) {
      expect(i18n.t(`notifications.type.${type}`, { ns: 'common' })).toBe(label);
    }

    controls.notifications = [{
      id: 'system-1', type: 'SYSTEM', title: 'Backend title', message: 'Backend prose',
      is_read: false, created_at: new Date().toISOString(),
    }];
    renderWithProviders(<NotificationList onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '系统通知' })).toBeTruthy();
    expect(screen.getByText('请查看最新系统通知。')).toBeTruthy();
    expect(screen.queryByText('Backend title')).toBeNull();
    expect(screen.queryByText('Backend prose')).toBeNull();
    const notificationButton = screen.getByRole('button', { name: /系统通知.*请查看最新系统通知.*未读/ });
    expect(notificationButton.getAttribute('aria-label')).not.toContain('Backend title');
    expect(notificationButton.getAttribute('aria-label')).not.toContain('Backend prose');
  });

  it('normalizes known vessel types and the generic voyage fallback', async () => {
    await loadNamespace('fleet');
    await changeLanguage('zh');
    renderWithProviders(<VesselDetailModal vessel={{
      id: 'v-1', name: 'MV Test', imo: '1234567', vesselType: 'General Cargo', status: 'At Sea',
      complianceEUETS: 'Compliant', complianceFuelEU: 'Compliant', ciiGrade: 'C',
      nextVoyage: 'En route', nextDryDock: 'TBD',
    }} onClose={vi.fn()} />);

    expect(screen.getByText(/杂货船/)).toBeTruthy();
    expect(screen.queryByText(/En route/)).toBeNull();
    expect(screen.getAllByText('航行中').length).toBeGreaterThanOrEqual(2);
    expect(i18n.t('detail.vesselType.RoRo', { ns: 'fleet' })).toBe('滚装船');
  });

  it('localizes reachable common accessibility and rate-limit chrome', async () => {
    await changeLanguage('zh');
    renderWithProviders(<LanguageSelector />);
    expect(screen.getByRole('button', { name: '更改语言' })).toBeTruthy();

    cleanup();
    renderWithProviders(<PublicNav />, { route: '/zh', path: '/:lang' });
    const openMenu = document.querySelector<HTMLButtonElement>('button[aria-label="打开菜单"]');
    expect(openMenu).toBeTruthy();
    fireEvent.click(openMenu!);
    expect(document.querySelector('button[aria-label="关闭菜单"]')).toBeTruthy();

    cleanup();
    renderWithProviders(<ToastProvider><span>app</span></ToastProvider>);
    act(() => { window.dispatchEvent(new Event('verdaxis:rate-limited')); });
    expect(await screen.findByText('请求过于频繁')).toBeTruthy();
    expect(screen.getByText('请求受到速率限制，数据可能暂时不是最新；系统将很快自动重试。')).toBeTruthy();
  });
});
