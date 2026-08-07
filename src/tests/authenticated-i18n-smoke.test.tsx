import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';

import i18n, { loadNamespace } from '../i18n';
import { MobileDesktopGate } from '../components/MobileDesktopGate';
import { ComplianceDataInput } from '../components/compliance/ComplianceDataInput';
import { TabError } from '../components/admin/product-analytics/AnalyticsStates';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { NeedsAttentionFeed } from '../components/NeedsAttentionFeed';
import { Training } from '../components/Training';
import type { Trade } from '../types';
import { renderWithProviders } from './test-utils';

describe('authenticated Chinese i18n smoke coverage', () => {
  afterEach(async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
  });

  it('translates authenticated shell gate copy', async () => {
    await act(async () => { await i18n.changeLanguage('zh'); });

    renderWithProviders(<MobileDesktopGate><div>workspace</div></MobileDesktopGate>);

    expect(screen.getByRole('heading', { name: '建议使用桌面设备' })).toBeTruthy();
  });

  it('translates the compliance upload workflow', async () => {
    await loadNamespace('compliance');
    await act(async () => { await i18n.changeLanguage('zh'); });

    renderWithProviders(<ComplianceDataInput />);

    expect(screen.getByRole('heading', { name: '上传燃油交付单（BDN）' })).toBeTruthy();
  });

  it('uses a translated safe analytics fallback instead of backend prose', async () => {
    await loadNamespace('admin');
    await act(async () => { await i18n.changeLanguage('zh'); });

    renderWithProviders(<TabError message="backend exploded" onRetry={vi.fn()} />);

    expect(screen.getByText('此分析标签页加载失败。')).toBeTruthy();
    expect(screen.queryByText('backend exploded')).toBeNull();
  });

  it('translates training cards and course details from education keys', async () => {
    await loadNamespace('education');
    await act(async () => { await i18n.changeLanguage('zh'); });

    renderWithProviders(<Training />);

    expect(screen.getByRole('heading', { name: '甲醇加注安全二级课程' })).toBeTruthy();
    expect(screen.getByText('4 小时')).toBeTruthy();
    expect(screen.getByText('中级')).toBeTruthy();
    expect(screen.queryByText('Methanol Bunkering Safety L2')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: '查看课程' })[0]);
    expect(screen.getByText('船员使用甲醇燃料时所需的核心安全与操作规程。')).toBeTruthy();
    expect(screen.getByText('材料安全数据表（MSDS）审查')).toBeTruthy();
    expect(screen.queryByText('Material Safety Data Sheet (MSDS) Review')).toBeNull();
  });

  it('translates generic attention fuels while preserving canonical products', async () => {
    await act(async () => { await i18n.changeLanguage('zh'); });
    const makeTrade = (id: string, fuelType: string, productName?: string): Trade => ({
      id,
      buyer_id: 'buyer-1',
      seller_id: 'seller-1',
      buyer_name: 'Buyer Org',
      seller_name: 'Seller Org',
      initiated_by: 'SELLER',
      is_anonymous: false,
      quantity_mt: 100,
      price_per_mt_usd: 700,
      status: 'PENDING_CONFIRMATION',
      commission_rate_pct: 1,
      created_at: '2026-08-07T00:00:00Z',
      fuel_type: fuelType,
      product_name: productName,
      region: 'Singapore',
    });
    const trades = [
      makeTrade('generic-methanol', 'Methanol'),
      makeTrade('generic-ethanol', 'Ethanol'),
      makeTrade('bio-methanol', 'Methanol', 'Bio Methanol'),
      makeTrade('e-methanol', 'Methanol', 'e-Methanol'),
      makeTrade('bio-ethanol', 'Ethanol', 'Bio Ethanol'),
      makeTrade('e-ethanol', 'Ethanol', 'e-Ethanol'),
    ];

    renderWithProviders(<NeedsAttentionFeed trades={trades} viewMode="BUYER" onNavigate={vi.fn()} />);

    expect(screen.getByText('甲醇')).toBeTruthy();
    expect(screen.getByText('乙醇')).toBeTruthy();
    for (const product of ['Bio Methanol', 'e-Methanol', 'Bio Ethanol', 'e-Ethanol']) {
      expect(screen.getByText(product)).toBeTruthy();
    }
  });

  it('hides raw render errors behind the translated fallback in Chinese', async () => {
    await act(async () => { await i18n.changeLanguage('zh'); });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Broken = () => { throw new Error('raw render failure'); };

    renderWithProviders(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(screen.getByText('出了点问题，请重试。')).toBeTruthy();
    expect(screen.queryByText('raw render failure')).toBeNull();
    consoleError.mockRestore();
  });
});
