import { describe, expect, it, vi } from 'vitest';
import { createSnapshotRequests } from '../lib/query/snapshotRequests';
import { createRefreshLifecycle } from '../lib/query/refreshCoordinator';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup() {
  const read = vi.fn<() => Promise<string>>();
  const apply = vi.fn();
  const change = vi.fn();
  const requests = createSnapshotRequests({ read, apply, change });
  return { read, apply, change, requests };
}

// The hook registers these requests with the shared per-key lifecycle. The
// lifecycle, not the helper, decides which signals one read already covers.
function registered() {
  const parts = setup();
  const lifecycle = createRefreshLifecycle<string>({
    ordinary: () => parts.requests.ordinary(),
    forced: () => parts.requests.force(),
  });
  return { ...parts, lifecycle };
}

describe('snapshot request ordering', () => {
  it('shares ordinary work and coalesces force signals without cancelling ordinary work', async () => {
    const { read, apply, requests } = setup();
    const ordinary = deferred<string>();
    const forced = deferred<string>();
    read.mockReturnValueOnce(ordinary.promise).mockReturnValueOnce(forced.promise);
    const first = requests.ordinary();
    const duplicate = requests.ordinary();
    const force = requests.force();
    const duplicateForce = requests.force();
    expect(read).toHaveBeenCalledTimes(2);
    forced.resolve('new');
    await Promise.all([force, duplicateForce]);
    ordinary.resolve('old');
    expect(await first).toBe('new');
    expect(await duplicate).toBe('new');
    expect(apply.mock.calls).toEqual([['new']]);
  });

  it('accepts ordinary success after the newer force fails', async () => {
    const { read, apply, requests } = setup();
    const ordinary = deferred<string>();
    const forced = deferred<string>();
    read.mockReturnValueOnce(ordinary.promise).mockReturnValueOnce(forced.promise);
    const first = requests.ordinary();
    const force = requests.force();
    forced.reject(new Error('resume failed'));
    await expect(force).rejects.toThrow('resume failed');
    ordinary.resolve('fallback');
    expect(await first).toBe('fallback');
    expect(apply.mock.calls).toEqual([['fallback']]);
  });

  it('does not report an older ordinary failure after a newer success', async () => {
    const { read, apply, change, requests } = setup();
    const ordinary = deferred<string>();
    read.mockReturnValueOnce(ordinary.promise).mockResolvedValueOnce('new');
    const first = requests.ordinary();
    await requests.force();
    ordinary.reject(new Error('obsolete failure'));
    expect(await first).toBe('new');
    expect(apply.mock.calls).toEqual([['new']]);
    expect(change).toHaveBeenLastCalledWith({ loading: false, refreshing: false, error: false });
  });

  it('starts an ordinary read at once and leaves cross-kind ordering to the registered lifecycle', async () => {
    const { read, requests } = setup();
    const forced = deferred<string>();
    read.mockReturnValueOnce(forced.promise).mockResolvedValueOnce('ordinary');
    const force = requests.force();
    expect(await requests.ordinary()).toBe('ordinary');
    expect(read).toHaveBeenCalledTimes(2);
    forced.resolve('forced');
    await force;
  });

  it('makes exactly one post-event read after forced work, whatever other signals join it', async () => {
    const { read, apply, lifecycle } = registered();
    const forced = deferred<string>();
    read.mockReturnValueOnce(forced.promise).mockResolvedValueOnce('event');
    const force = lifecycle.force();
    lifecycle.invalidate();
    const batch = lifecycle.flush();
    const observer = lifecycle.ordinary();
    const resume = lifecycle.force();
    expect(read).toHaveBeenCalledTimes(1);
    forced.resolve('before-event');
    await Promise.all([force, observer, resume, batch]);
    expect(read).toHaveBeenCalledTimes(2);
    expect(apply.mock.calls).toEqual([['before-event'], ['event']]);
    lifecycle.dispose();
  });

  it('lets one forced read that starts after an event cover it', async () => {
    const { read, apply, lifecycle } = registered();
    const forced = deferred<string>();
    read.mockReturnValueOnce(forced.promise);
    lifecycle.invalidate();
    const force = lifecycle.force();
    const observer = lifecycle.ordinary();
    const batch = lifecycle.flush();
    forced.resolve('covered');
    await Promise.all([force, observer, batch]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls).toEqual([['covered']]);
    lifecycle.dispose();
  });

  it('reads once more for an event during an ordinary read and applies only the newest value', async () => {
    const { read, apply, lifecycle } = registered();
    const ordinary = deferred<string>();
    read.mockReturnValueOnce(ordinary.promise).mockResolvedValueOnce('event');
    const first = lifecycle.ordinary();
    lifecycle.invalidate();
    const batch = lifecycle.flush();
    ordinary.resolve('before-event');
    await Promise.all([first, batch]);
    expect(read).toHaveBeenCalledTimes(2);
    expect(apply.mock.calls).toEqual([['before-event'], ['event']]);
    lifecycle.dispose();
  });

  it('refuses reads and drops the pending event read after the lifecycle is disposed', async () => {
    const { read, apply, change, requests, lifecycle } = registered();
    const forced = deferred<string>();
    read.mockReturnValueOnce(forced.promise);
    const force = lifecycle.force().catch(() => undefined);
    lifecycle.invalidate();
    const batch = lifecycle.flush();
    lifecycle.dispose();
    requests.dispose();
    const changes = change.mock.calls.length;
    forced.resolve('late');
    await Promise.all([force, batch]);
    await expect(lifecycle.ordinary()).rejects.toMatchObject({ name: 'AbortError' });
    expect(read).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
    expect(change).toHaveBeenCalledTimes(changes);
  });

  it('rejects all applications and status changes after disposal', async () => {
    const { read, apply, change, requests } = setup();
    const ordinary = deferred<string>();
    const forced = deferred<string>();
    read.mockReturnValueOnce(ordinary.promise).mockReturnValueOnce(forced.promise);
    const first = requests.ordinary().catch(() => undefined);
    const force = requests.force().catch(() => undefined);
    requests.dispose();
    const changes = change.mock.calls.length;
    ordinary.resolve('old');
    forced.reject(new Error('old failure'));
    await Promise.all([first, force]);
    expect(apply).not.toHaveBeenCalled();
    expect(change).toHaveBeenCalledTimes(changes);
  });
});
