import { describe, expect, it, vi } from 'vitest';
import { createRefreshLifecycle } from '../lib/query/refreshCoordinator';

function deferred() {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>(done => { resolve = done; });
    return { promise, resolve };
}

describe('registered refresh lifecycle', () => {
    it('lets one forced resume satisfy hidden invalidation and observer re-enable', async () => {
        const pending = deferred();
        const read = vi.fn().mockReturnValue(pending.promise);
        const lifecycle = createRefreshLifecycle({ ordinary: read, forced: read });
        lifecycle.invalidate(); lifecycle.invalidate();
        const resume = lifecycle.force();
        const observer = lifecycle.ordinary();
        const batch = lifecycle.flush();
        expect(read).toHaveBeenCalledTimes(1);
        pending.resolve('resumed');
        await Promise.all([resume, observer, batch]);
        expect(read).toHaveBeenCalledTimes(1);
        lifecycle.dispose();
    });

    it('keeps exactly one extra read for committed events during forced work', async () => {
        const pending = deferred();
        const ordinary = vi.fn().mockResolvedValue('after-event');
        const forced = vi.fn().mockReturnValue(pending.promise);
        const lifecycle = createRefreshLifecycle({ ordinary, forced });
        lifecycle.invalidate();
        const resume = lifecycle.force();
        lifecycle.invalidate(); lifecycle.invalidate();
        const first = lifecycle.flush(); const duplicate = lifecycle.flush();
        expect(ordinary).not.toHaveBeenCalled();
        pending.resolve('before-event');
        await Promise.all([resume, first, duplicate]);
        expect(forced).toHaveBeenCalledTimes(1);
        expect(ordinary).toHaveBeenCalledTimes(1);
        lifecycle.dispose();
    });

    it('tracks ordinary completion too, retaining one post-event read', async () => {
        const pending = deferred();
        const read = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue('new');
        const lifecycle = createRefreshLifecycle({ ordinary: read, forced: read });
        const initial = lifecycle.ordinary();
        lifecycle.invalidate(); const batch = lifecycle.flush();
        pending.resolve('old'); await Promise.all([initial, batch]);
        expect(read).toHaveBeenCalledTimes(2);
        lifecycle.dispose();
    });

    it('disposal detaches pending dirty work and keys stay independent', async () => {
        const pending = deferred();
        const a = vi.fn().mockReturnValue(pending.promise);
        const b = vi.fn().mockResolvedValue('b');
        const first = createRefreshLifecycle({ ordinary: a, forced: a });
        const second = createRefreshLifecycle({ ordinary: b, forced: b });
        const running = first.force(); first.invalidate(); const queued = first.flush();
        second.invalidate(); await second.flush();
        expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(1);
        first.dispose(); pending.resolve('late'); await Promise.all([running, queued]);
        expect(a).toHaveBeenCalledTimes(1);
        await expect(first.ordinary()).rejects.toMatchObject({ name: 'AbortError' });
        second.dispose();
    });

    it('reads nothing when no signal is uncovered and reports disposal once', async () => {
        const read = vi.fn().mockResolvedValue('value');
        const onDispose = vi.fn();
        const lifecycle = createRefreshLifecycle({ ordinary: read, forced: read }, onDispose);
        await lifecycle.flush();
        expect(read).not.toHaveBeenCalled();
        lifecycle.dispose(); lifecycle.dispose();
        expect(onDispose).toHaveBeenCalledTimes(1);
    });

    it('does not read again for a signal that arrived before the last read started', async () => {
        const read = vi.fn().mockResolvedValue('value');
        const lifecycle = createRefreshLifecycle({ ordinary: read, forced: read });
        lifecycle.invalidate();
        await lifecycle.force();
        await lifecycle.flush();
        expect(read).toHaveBeenCalledTimes(1);
        lifecycle.invalidate();
        await lifecycle.flush();
        expect(read).toHaveBeenCalledTimes(2);
        lifecycle.dispose();
    });
});
