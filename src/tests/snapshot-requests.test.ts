import { describe, expect, it, vi } from 'vitest';
import { createSnapshotRequests } from '../lib/query/snapshotRequests';

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

  it('waits for forced work then makes the requested post-event read', async () => {
    const { read, apply, requests } = setup();
    const forced = deferred<string>();
    read.mockReturnValueOnce(forced.promise).mockResolvedValueOnce('event');
    const force = requests.force();
    const event = requests.ordinary();
    requests.force();
    expect(read).toHaveBeenCalledTimes(1);
    forced.resolve('before-event');
    await force;
    expect(await event).toBe('event');
    expect(read).toHaveBeenCalledTimes(2);
    expect(apply.mock.calls).toEqual([['before-event'], ['event']]);
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
