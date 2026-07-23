import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActingOrganizationBanner } from '../components/market-support/ActingOrganizationBanner';

describe('ActingOrganizationBanner', () => {
  it('shows the real admin, accountable supplier, case, expiry, and exit action', () => {
    const onExit = vi.fn();
    render(
      <ActingOrganizationBanner
        context={{
          id: 'ctx-1',
          status: 'ACTIVE',
          version: 1,
          startedAt: '2026-07-23T08:00:00.000Z',
          organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
          accountablePrincipal: { id: 'supplier-1', name: 'Amina Supplier', email: 'amina@example.com' },
          actor: { id: 'admin-1', name: 'Ravi Admin', email: 'ravi@verdaxis.exchange' },
          supportReference: 'CASE-42',
          expiresAt: '2026-07-23T18:00:00.000Z',
          scope: ['ASK_CREATE', 'ASK_CANCEL'],
        }}
        onExit={onExit}
      />,
    );

    expect(screen.getByText('Market Support - Acting for Northstar Fuels as Supplier')).toBeTruthy();
    expect(screen.getByText(/Ravi Admin/)).toBeTruthy();
    expect(screen.getByText(/Amina Supplier/)).toBeTruthy();
    expect(screen.getByText(/CASE-42/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /exit/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
