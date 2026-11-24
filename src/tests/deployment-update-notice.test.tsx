import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeploymentUpdateNotice, deployedEntryAssetChanged } from '../components/DeploymentUpdateNotice';

describe('DeploymentUpdateNotice', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.head.innerHTML = '';
  });

  const oldShell = '<script type="module" src="/assets/index-old.js"></script>';
  const newShell = '<script type="module" src="/assets/index-new.js"></script>';
  const response = (html: string) => ({ ok: true, text: async () => html });

  function renderNotice() {
    vi.stubEnv('DEV', false);
    document.head.innerHTML = oldShell;
    return render(<DeploymentUpdateNotice />);
  }

  it('does not check hidden tabs or overlap the return check with a pending read', async () => {
    vi.useFakeTimers();
    let visibility: DocumentVisibilityState = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    const show = (state: DocumentVisibilityState) => act(() => {
      visibility = state;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    let finish!: () => void;
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise((resolve) => {
      finish = () => resolve(response(oldShell));
    })).mockResolvedValue(response(newShell));
    vi.stubGlobal('fetch', fetchMock);

    renderNotice();
    await act(() => vi.advanceTimersByTimeAsync(300_000));
    expect(fetchMock).not.toHaveBeenCalled();

    show('visible');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    show('hidden');
    show('visible');
    await act(() => vi.advanceTimersByTimeAsync(300_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeTruthy();
  });

  it('offers a refresh when the deployed entry bundle changes', async () => {
    document.head.innerHTML = '<script type="module" src="/assets/index-old.js"></script>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<script type="module" src="/assets/index-new.js"></script>',
    }));

    await expect(deployedEntryAssetChanged(document)).resolves.toBe(true);
  });
});
