import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '../components/layout/Sidebar';
import { renderWithProviders } from './test-utils';

const primaryLinks = [
  ['Command Center', '/app/home'],
  ['Intelligence Map', '/app/map'],
  ['Marketplace', '/app/marketplace'],
  ['Forward Curve', '/app/curve'],
  ['Watchlist', '/app/watchlist'],
  ['Analytics', '/app/analytics'],
  ['Trade History', '/app/trades'],
];

function renderSidebar(viewMode: 'BUYER' | 'SUPPLIER', isMarketSupportActive = false) {
  const onPrimaryAction = vi.fn();
  renderWithProviders(React.createElement(Sidebar, {
    viewMode,
    currentPage: 'MARKETPLACE',
    onNavigate: () => undefined,
    isCollapsed: false,
    onToggleCollapse: () => undefined,
    isMobileOpen: false,
    onMobileClose: () => undefined,
    isMarketSupportActive,
    onPrimaryAction,
  }));

  const links = within(screen.getByRole('navigation')).getAllByRole('link');
  return { links, onPrimaryAction };
}

describe('sidebar navigation', () => {
  it.each(['BUYER', 'SUPPLIER'] as const)('offers the shared primary destinations to %s', viewMode => {
    const { links } = renderSidebar(viewMode);

    expect(links).toHaveLength(primaryLinks.length);
    primaryLinks.forEach(([label, path], index) => {
      expect(links[index]).toBe(screen.getByRole('link', { name: label }));
      expect(links[index].getAttribute('href')).toBe(path);
    });
  });

  it('keeps private destinations out of an assisted workspace', () => {
    const { links, onPrimaryAction } = renderSidebar('SUPPLIER', true);

    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/app/home', '/app/map', '/app/marketplace', '/app/curve', '/app/analytics',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Post Supply' }));
    expect(onPrimaryAction).toHaveBeenCalledOnce();
  });
});
