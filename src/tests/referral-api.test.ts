import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';

const fetchMock = vi.fn();

describe('referral code API client', () => {
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
    });

    it('loads the referral code through the declared POST mutation', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({
                referral_code: 'VDX-ABC123',
                referral_link: 'https://example.test/invite/VDX-ABC123',
            }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        vi.stubGlobal('fetch', fetchMock);

        await api.referrals.getCode();

        const [url, options] = fetchMock.mock.calls[0] ?? [];
        expect(String(url)).toContain('/referrals/my-code');
        expect(options?.method).toBe('POST');
    });
});
