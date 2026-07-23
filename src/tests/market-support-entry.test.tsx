import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MarketSupportEntryDialog } from '../components/admin/market-support/MarketSupportEntryDialog';

describe('MarketSupportEntryDialog', () => {
  it('offers entry only for approved REAL supplier organizations', () => {
    const onStart = vi.fn();
    render(
      <MarketSupportEntryDialog
        open
        organization={{ id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' }}
        entry={{
          eligible: true,
          organization: { id: 'org-1', name: 'Northstar Fuels', domain: null, type: 'REAL' },
          eligiblePrincipals: [{ id: 'supplier-1', name: 'Amina Supplier', email: 'amina@example.com' }],
        }}
        onStart={onStart}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: /enter supplier platform/i })).toBeTruthy();
    expect(screen.getByLabelText(/support reference/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/support reference/i), { target: { value: 'CASE-42' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /scope/i }));
    fireEvent.click(screen.getByRole('button', { name: /enter supplier platform/i }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ supportReference: 'CASE-42', principalId: 'supplier-1' }));
  });

  it('explains why an ineligible organization cannot be entered', () => {
    render(
      <MarketSupportEntryDialog
        open
        organization={{ id: 'org-2', name: 'Demo Org', domain: null, type: 'DEMO' }}
        entry={{ eligible: false, reason: 'Only approved REAL supplier organizations are supported.', eligiblePrincipals: [] }}
        onStart={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/only approved real supplier organizations/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /enter supplier platform/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
