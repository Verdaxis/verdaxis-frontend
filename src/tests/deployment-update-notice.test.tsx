import { afterEach, describe, expect, it, vi } from 'vitest';
import { deployedEntryAssetChanged } from '../components/DeploymentUpdateNotice';

describe('DeploymentUpdateNotice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.head.innerHTML = '';
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
