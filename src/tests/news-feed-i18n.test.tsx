import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { NewsFeed } from '../components/NewsFeed';
import i18n, { loadNamespace } from '../i18n';
import { renderWithProviders } from './test-utils';

const newsListMock = vi.fn();
const NEWS_ITEM = {
  id: 'news-1',
  title: 'Green methanol market expands',
  summary: null,
  source: 'Marine News',
  url: 'https://example.com/article',
  category: 'markets',
  relevance: 1,
  published_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
};

vi.mock('../services/api', () => ({
  api: {
    news: {
      list: (...args: unknown[]) => newsListMock(...args),
    },
  },
}));

describe('NewsFeed Chinese localization', () => {
  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  beforeEach(async () => {
    newsListMock.mockReset();
    newsListMock.mockResolvedValue([NEWS_ITEM]);
    await loadNamespace('dashboard');
    await i18n.changeLanguage('zh');
  });

  it('localizes chrome and filter failures while preserving article metadata and API codes', async () => {
    renderWithProviders(<NewsFeed />);

    expect(await screen.findByText('新闻动态')).toBeTruthy();
    expect(await screen.findByText(NEWS_ITEM.title)).toBeTruthy();
    expect(screen.getByText('Marine News')).toBeTruthy();
    expect(screen.getByText('5分钟前')).toBeTruthy();

    newsListMock.mockRejectedValueOnce(new Error('filter failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: '航运' }));
    await waitFor(() => {
      expect(newsListMock).toHaveBeenLastCalledWith({ limit: 10, category: 'shipping' });
    });
    expect((await screen.findByRole('alert')).textContent).toContain('无法加载新闻');
    expect(screen.queryByText(NEWS_ITEM.title)).toBeNull();
    consoleError.mockRestore();
  });

  it('keeps loaded articles visible when the background refresh fails', async () => {
    vi.useFakeTimers();
    newsListMock
      .mockReset()
      .mockResolvedValueOnce([NEWS_ITEM])
      .mockRejectedValueOnce(new Error('refresh failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<NewsFeed />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(NEWS_ITEM.title)).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    });

    expect(screen.getByText(NEWS_ITEM.title)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
