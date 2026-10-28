import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from './test-utils';
import { OrderPlaceModal } from '../components/OrderPlaceModal';
import { AbilitiesProvider } from '../context/AbilitiesContext';
import i18n, { loadNamespace } from '../i18n';
import { abilitiesPayload } from './abilities-fixtures';

const { mineMock, productsMock, deliveryPointsMock, authState, supportState } = vi.hoisted(() => ({
  mineMock: vi.fn(),
  productsMock: vi.fn(),
  deliveryPointsMock: vi.fn(),
  authState: { user: { id: 'user-1', email: 'u@example.com', role: 'BUYER', organization_id: 'org-1', status: 'APPROVED' } as Record<string, unknown> },
  supportState: { context: null as unknown, isActive: false },
}));

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  api: {
    abilities: { mine: mineMock },
    catalog: { products: productsMock, deliveryPoints: deliveryPointsMock },
    orderbook: { create: vi.fn() },
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ ...supportState, isLoading: false }),
}));

const renderModal = (side: 'BID' | 'ASK') => renderWithProviders(
  <AbilitiesProvider>
    <OrderPlaceModal isOpen onClose={() => undefined} side={side} />
  </AbilitiesProvider>,
);

const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

describe('OrderPlaceModal server abilities', () => {
  beforeEach(async () => {
    await loadNamespace('trading');
    await i18n.changeLanguage('en');
    mineMock.mockReset();
    productsMock.mockResolvedValue([]);
    deliveryPointsMock.mockResolvedValue([]);
    supportState.context = null;
    supportState.isActive = false;
  });

  it('disables the submit button and explains why when placing this side is denied', async () => {
    mineMock.mockResolvedValue(abilitiesPayload({ place_bid_order: { code: 'ACCOUNT_NOT_APPROVED' } }));

    renderModal('BID');

    const note = await screen.findByTestId('ability-denial-note');
    expect(note.textContent).toContain('Your account has not been approved yet.');
    const submit = screen.getByRole('button', { name: 'Review Bid' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(submit.getAttribute('title')).toBe('Your account has not been approved yet.');
  });

  it('judges each side by its own ability', async () => {
    mineMock.mockResolvedValue(abilitiesPayload({ place_bid_order: { code: 'BUYER_ROLE_REQUIRED' } }));

    renderModal('ASK');
    await settle();

    expect(screen.queryByTestId('ability-denial-note')).toBeNull();
  });

  it('keeps the review button governed by the form alone when the server allows the action', async () => {
    mineMock.mockResolvedValue(abilitiesPayload());

    renderModal('BID');
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    await settle();

    expect(screen.queryByTestId('ability-denial-note')).toBeNull();
    // Disabled only because the empty catalog leaves the form incomplete, with no title from abilities.
    expect(screen.getByRole('button', { name: 'Review Bid' }).hasAttribute('title')).toBe(false);
  });

  it('ignores the administrator\'s own denial while acting for a customer in a support context', async () => {
    supportState.context = { id: 'ctx-1', organization: { id: 'org-2', name: 'Acme', type: 'REAL' } };
    supportState.isActive = true;
    mineMock.mockResolvedValue(abilitiesPayload({ place_ask_order: { code: 'ADMIN_CANNOT_EXECUTE' } }));

    renderModal('ASK');
    await settle();

    expect(screen.queryByTestId('ability-denial-note')).toBeNull();
  });
});
