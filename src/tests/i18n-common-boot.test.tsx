import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

import i18n, { prepareBootLocale } from '../i18n';

// A consumer that uses the default namespace, exactly as the shell, header and
// most components do: `useTranslation()` with no argument resolves `common`.
const CommonConsumer: React.FC = () => {
  const { t } = useTranslation();
  return <p>{t('btn.save')}</p>;
};

function unloadCommon() {
  i18n.removeResourceBundle('en', 'common');
  i18n.removeResourceBundle('zh', 'common');
}

describe('common namespace boot load', () => {
  afterEach(async () => {
    // Restore the bundle for the rest of the suite.
    await act(async () => { await prepareBootLocale(); });
  });

  it('renders the raw key when common has not been awaited', () => {
    // The state at first paint if the boot path did not await `common`: the
    // default namespace has no bundle, so the key itself is rendered.
    act(() => { unloadCommon(); });
    render(<CommonConsumer />);
    expect(screen.getByText('btn.save')).toBeTruthy();
  });

  it('renders translated copy on the first render after the boot await', async () => {
    act(() => { unloadCommon(); });
    // This is the boot path's await, run before the first render.
    await act(async () => { await prepareBootLocale(); });

    render(<CommonConsumer />);
    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.queryByText('btn.save')).toBeNull();
  });

  it('loads a bundle for every supported language in one call', async () => {
    act(() => { unloadCommon(); });
    await act(async () => { await prepareBootLocale(); });
    expect(i18n.hasResourceBundle('en', 'common')).toBe(true);
    expect(i18n.hasResourceBundle('zh', 'common')).toBe(true);
  });
});
