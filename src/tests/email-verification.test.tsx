import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import VerifyEmailPage from '../pages/VerifyEmailPage';

describe('email verification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges the email token with a POST mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      email: 'candidate@example.test',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/verify-email?token=verification-token']}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });
});
