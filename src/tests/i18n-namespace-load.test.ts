import { describe, expect, it, vi } from 'vitest';

import i18n, { loadNamespace } from '../i18n';

// `rfq` is not one of the namespaces the shared test setup preloads, so this
// file owns both of its loaders. The mocks return unresolved promises, which
// lets the test observe the order the loaders start and resolve in.
const state = vi.hoisted(() => {
  const started: string[] = [];
  const resolve: Record<string, () => void> = {};
  const pending: Record<string, Promise<{ default: Record<string, string> }>> = {};

  for (const lang of ['en', 'zh']) {
    pending[lang] = new Promise((done) => {
      resolve[lang] = () => done({ default: { probe: lang } });
    });
  }

  return { started, resolve, pending };
});

vi.mock('../locales/en/rfq.json', () => {
  state.started.push('en');
  return state.pending.en;
});

vi.mock('../locales/zh/rfq.json', () => {
  state.started.push('zh');
  return state.pending.zh;
});

describe('loadNamespace', () => {
  it('starts every language loader before either resolves', async () => {
    const loading = loadNamespace('rfq');

    // Both loaders must be in flight while neither promise has settled. A
    // serial implementation would still show only `en` here.
    await vi.waitFor(() => {
      expect([...state.started].sort()).toEqual(['en', 'zh']);
    });
    expect(i18n.hasResourceBundle('en', 'rfq')).toBe(false);
    expect(i18n.hasResourceBundle('zh', 'rfq')).toBe(false);

    // Resolving one language must not wait for the other.
    state.resolve.en();
    await vi.waitFor(() => {
      expect(i18n.hasResourceBundle('en', 'rfq')).toBe(true);
    });
    expect(i18n.hasResourceBundle('zh', 'rfq')).toBe(false);

    state.resolve.zh();
    await loading;

    expect(i18n.hasResourceBundle('zh', 'rfq')).toBe(true);
  });
});
