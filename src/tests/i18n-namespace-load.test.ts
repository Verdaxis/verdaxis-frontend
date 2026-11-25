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
  it('loads English alone and prepares Chinese before publishing a language switch', async () => {
    await i18n.changeLanguage('en');
    const english = loadNamespace('rfq');
    await vi.waitFor(() => expect(state.started).toContain('en'));
    state.resolve.en();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state.started).toEqual(['en']);
    await english;
    expect(i18n.t('probe', { ns: 'rfq' })).toBe('en');

    const switching = i18n.changeLanguage('zh');
    await vi.waitFor(() => expect(state.started).toContain('zh'));
    expect(i18n.t('probe', { ns: 'rfq' })).toBe('en');
    state.resolve.zh();
    await switching;
    expect(i18n.t('probe', { ns: 'rfq' })).toBe('zh');
    expect(i18n.t('probe', { ns: 'rfq', lng: 'en' })).toBe('en');
    await i18n.changeLanguage('en');
  });
});
