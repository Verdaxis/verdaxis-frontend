import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  users: vi.fn(),
  reviewQueue: vi.fn(),
  reviewCase: vi.fn(),
  rejectUser: vi.fn(),
  onboardingAttention: vi.fn(),
  offboardingPreview: vi.fn(),
  offboardUser: vi.fn(),
  offboardingTrades: vi.fn(),
  reassignResponsible: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  user: { id: 'admin-1', role: 'ADMIN' } as { id: string; role: string } | null,
}));

vi.mock('../services/api', async importOriginal => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    api: {
      ...original.api,
      admin: {
        ...original.api.admin,
        ...mocks,
      },
    },
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: auth.user }),
}));

vi.mock('../context/MarketSupportContext', () => ({
  useMarketSupport: () => ({ start: vi.fn(), resume: vi.fn() }),
}));

vi.mock('../components/admin/product-analytics/ProductAnalyticsWorkspace', () => ({
  ProductAnalyticsWorkspace: () => null,
}));

import { AdminDashboard } from '../components/admin/AdminDashboard';
import { ApiError, ApiOutcomeUnknownError } from '../services/api';
import { OFFBOARDING_ERROR_CODES } from '../components/admin/adminErrors';
import { clearAccessToken } from '../services/authToken';
import { clearMarketSupportContextId, setMarketSupportContextId } from '../services/marketSupportContextStore';
import i18n, { loadNamespace } from '../i18n';

const member = {
  id: 'user-1',
  email: 'mei@northstar.example',
  first_name: 'Mei',
  last_name: 'Tan',
  role: 'BUYER',
  status: 'APPROVED',
  created_at: '2026-07-29T15:00:00Z',
  org_name: 'Northstar Shipping',
  org_type: 'SHIPPING_LINE',
  org_provenance: 'REAL',
  organization_id: 'org-1',
};

const detached = {
  ...member,
  id: 'user-2',
  email: 'omar@former.example',
  first_name: 'Omar',
  last_name: 'Aziz',
  role: 'SUPPLIER',
  org_name: null,
  org_type: null,
  org_provenance: null,
  organization_id: null,
};

const colleague = {
  ...member,
  id: 'user-4',
  email: 'lena@northstar.example',
  first_name: 'Lena',
  last_name: 'Ortiz',
};

const otherAdmin = {
  ...member,
  id: 'admin-2',
  email: 'ops@verdaxis.example',
  first_name: 'Ops',
  last_name: 'Admin',
  role: 'ADMIN',
  org_name: null,
  organization_id: null,
};

const pendingApplicant = {
  ...member,
  id: 'user-5',
  email: 'new@applicant.example',
  first_name: 'New',
  last_name: 'Applicant',
  status: 'PENDING',
};

const memberPreview = {
  user_id: 'user-1',
  email: 'mei@northstar.example',
  status: 'APPROVED',
  organization_id: 'org-1',
  organization_name: 'Northstar Shipping',
  offboarded_at: null,
  open_owned_orders: 3,
  pending_trades: 2,
  frozen_pending_trades: 0,
  confirmed_trades: 4,
  delivered_trades: 1,
  informational_counts_capped: false,
};

const detachedPreview = {
  ...memberPreview,
  user_id: 'user-2',
  email: 'omar@former.example',
  organization_id: null,
  organization_name: null,
  open_owned_orders: 0,
  pending_trades: 0,
  confirmed_trades: 0,
  delivered_trades: 0,
};

// The list holds the person's own sides: the responsible person is always the
// target, and a side carries only the recorded organization's id.
const ordinaryTrade = {
  trade_id: 'trade-ordinary',
  side: 'BUYER',
  status: 'CONFIRMED',
  recorded_organization_id: 'org-1',
  responsible_user_id: 'user-1',
  frozen: false,
  manual_resolution_required: false,
};
// What the real client returns after it maps the wire shape (component tests
// replace the admin calls) and the wire shape itself (contract tests).
const tradePage = (items: unknown[], extra: { total?: number; user_id?: string } = {}) => {
  const total = extra.total ?? items.length;
  return { user_id: extra.user_id ?? 'user-1', items, total, truncated: total > items.length };
};
const rawTradePage = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  user_id: 'user-1',
  items,
  total: items.length,
  skip: 0,
  limit: 100,
  ...extra,
});
const frozenTrade = { ...ordinaryTrade, trade_id: 'trade-frozen', status: 'DELIVERED', frozen: true };
const sellerTrade = { ...ordinaryTrade, trade_id: 'trade-seller', side: 'SELLER' };
const assistedTrade = { ...ordinaryTrade, trade_id: 'trade-assisted', manual_resolution_required: true };

const offboardResult = {
  operation_id: 'op-123',
  user_id: 'user-1',
  former_organization_id: 'org-1',
  status: 'REJECTED',
  offboarded_at: '2026-11-02T10:00:00Z',
};

const reassignResult = {
  trade_id: 'trade-ordinary',
  side: 'BUYER',
  status: 'CONFIRMED',
  recorded_organization_id: 'org-1',
  previous_responsible_user_id: 'user-1',
  responsible_user_id: 'user-4',
  reassigned_at: '2026-11-02T10:05:00Z',
};

const renderUsers = () => render(
  <MemoryRouter initialEntries={['/app/admin/users']}>
    <AdminDashboard />
  </MemoryRouter>,
);

const fillOffboardForm = (caseRef = 'CASE-2026/0042') => {
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'COMPANY_REQUEST' } });
  fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: caseRef } });
};

const tickConfirmation = () => fireEvent.click(screen.getByLabelText(/I understand that access ends/));

const confirmButton = () => screen.getByRole('button', { name: 'Offboard member' }) as HTMLButtonElement;

const openOffboardDialog = async (email = 'mei@northstar.example') => {
  fireEvent.click(await screen.findByRole('button', { name: `Offboard member ${email}` }));
  await screen.findByText('Advisory counts');
};

describe('admin member offboarding', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('VITE_OFFBOARDING_ENABLED', 'true');
    auth.user = { id: 'admin-1', role: 'ADMIN' };
    mocks.users.mockResolvedValue({
      total: 5,
      items: [pendingApplicant, member, detached, colleague, otherAdmin],
    });
    mocks.reviewQueue.mockResolvedValue({ items: [], limit: 100 });
    mocks.onboardingAttention.mockResolvedValue({ items: [], generated_at: '2026-10-31T00:00:00Z' });
    mocks.offboardingPreview.mockResolvedValue(memberPreview);
    mocks.offboardUser.mockResolvedValue(offboardResult);
    mocks.offboardingTrades.mockResolvedValue(tradePage([ordinaryTrade]));
    mocks.reassignResponsible.mockResolvedValue(reassignResult);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await act(async () => { await i18n.changeLanguage('en'); });
  });

  describe('visibility', () => {
    it('offboarding_action_is_separate_from_reject', async () => {
      renderUsers();

      await screen.findByText('Mei Tan');
      // Pending applicants keep Reject and never get the offboarding action.
      expect(screen.getAllByRole('button', { name: 'Reject' })).toHaveLength(1);
      expect(screen.queryByRole('button', { name: 'Offboard member new@applicant.example' })).toBeNull();
      // Approved members get the separate offboarding action and no Reject.
      expect(screen.getByRole('button', { name: 'Offboard member mei@northstar.example' })).toBeTruthy();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());
      await waitFor(() => expect(mocks.offboardUser).toHaveBeenCalledTimes(1));
      expect(mocks.rejectUser).not.toHaveBeenCalled();
    });

    it('non_admin_has_no_actions', async () => {
      auth.user = { id: 'user-9', role: 'BUYER' };
      renderUsers();

      await screen.findByText('Mei Tan');
      expect(screen.queryByRole('button', { name: /Offboard member/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /Handover trades/ })).toBeNull();
    });

    it('hides_every_action_while_the_release_switch_is_off', async () => {
      vi.stubEnv('VITE_OFFBOARDING_ENABLED', '');
      renderUsers();

      await screen.findByText('Mei Tan');
      expect(screen.queryByRole('button', { name: /Offboard member/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /Handover trades/ })).toBeNull();
    });

    it('offers_no_action_for_admins', async () => {
      renderUsers();

      await screen.findByText('Mei Tan');
      expect(screen.queryByRole('button', { name: 'Offboard member ops@verdaxis.example' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Offboard member omar@former.example' })).toBeTruthy();
    });

    it('offers_no_action_for_the_signed_in_admin_account', async () => {
      auth.user = { id: 'user-1', role: 'ADMIN' };
      renderUsers();

      await screen.findByText('Mei Tan');
      expect(screen.queryByRole('button', { name: 'Offboard member mei@northstar.example' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Offboard member omar@former.example' })).toBeTruthy();
    });
  });

  describe('dialog flow', () => {
    it('shows_detached_target_and_explicit_null', async () => {
      mocks.offboardingPreview.mockResolvedValue(detachedPreview);
      renderUsers();

      await openOffboardDialog('omar@former.example');
      expect(mocks.offboardingPreview).toHaveBeenCalledWith('user-2');
      expect(within(screen.getByRole('dialog')).getByText('No company (detached)')).toBeTruthy();

      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      await waitFor(() => expect(mocks.offboardUser).toHaveBeenCalledTimes(1));
      const [userId, input] = mocks.offboardUser.mock.calls[0];
      expect(userId).toBe('user-2');
      expect(Object.prototype.hasOwnProperty.call(input, 'expected_organization_id')).toBe(true);
      expect(input).toEqual({
        reason_code: 'COMPANY_REQUEST',
        evidence_case_ref: 'CASE-2026/0042',
        urgent: false,
        expected_organization_id: null,
      });
    });

    it('submits_the_displayed_company_and_the_urgent_flag', async () => {
      renderUsers();

      await openOffboardDialog();
      expect(within(screen.getByRole('dialog')).getByText('Northstar Shipping')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'SECURITY_CONCERN' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: ' SEC-2026-11-0001 ' } });
      fireEvent.click(screen.getByLabelText(/Mark as urgent/));
      tickConfirmation();
      fireEvent.click(confirmButton());

      await waitFor(() => expect(mocks.offboardUser).toHaveBeenCalledWith('user-1', {
        reason_code: 'SECURITY_CONCERN',
        evidence_case_ref: 'SEC-2026-11-0001',
        urgent: true,
        expected_organization_id: 'org-1',
      }));
    });

    it('preview_counts_are_advisory', async () => {
      renderUsers();

      await openOffboardDialog();
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/These counts are advisory/)).toBeTruthy();
      expect(within(dialog).getByText(/can change when you confirm/)).toBeTruthy();
      expect(within(dialog).getByTestId('offboard-count-openOrders').textContent).toBe('3');
      expect(within(dialog).getByTestId('offboard-count-pendingTrades').textContent).toBe('2');
      expect(within(dialog).getByTestId('offboard-count-frozenPendingTrades').textContent).toBe('0');
      expect(within(dialog).getByTestId('offboard-count-confirmedTrades').textContent).toBe('4');
      expect(within(dialog).getByTestId('offboard-count-deliveredTrades').textContent).toBe('1');
      // The warning names every effect of the action.
      expect(within(dialog).getByText(/signed out everywhere and cannot sign in again/)).toBeTruthy();
      expect(within(dialog).getByText(/pending confirmation are cancelled/)).toBeTruthy();
      expect(within(dialog).getByText(/open remainder of their orders is withdrawn/)).toBeTruthy();
      expect(within(dialog).getByText(/Confirmed and delivered trades stay in place/)).toBeTruthy();
    });

    it('requires_reason_reference_and_explicit_confirmation', async () => {
      renderUsers();

      await openOffboardDialog();
      expect(confirmButton().disabled).toBe(true);

      fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'COMPANY_REQUEST' } });
      tickConfirmation();
      expect(confirmButton().disabled).toBe(true);

      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'has spaces and personal@mail.example' } });
      expect(confirmButton().disabled).toBe(true);
      expect(screen.getByText(/Use CASE, REQ, SEC or TICKET/)).toBeTruthy();

      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'CASE-9' } });
      expect(confirmButton().disabled).toBe(false);

      fireEvent.click(screen.getByLabelText(/I understand that access ends/));
      expect(confirmButton().disabled).toBe(true);
      expect(mocks.offboardUser).not.toHaveBeenCalled();
    });

    it('blocks_confirmation_when_the_preview_cannot_be_read', async () => {
      mocks.offboardingPreview.mockRejectedValueOnce(new ApiError('nope', 500, null));
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: 'Offboard member mei@northstar.example' }));
      expect(await screen.findByText('Could not load the account details.')).toBeTruthy();
      expect(confirmButton().disabled).toBe(true);

      mocks.offboardingPreview.mockResolvedValueOnce(memberPreview);
      fireEvent.click(screen.getByRole('button', { name: 'Reload details' }));
      await screen.findByText('Advisory counts');
      fillOffboardForm();
      tickConfirmation();
      expect(confirmButton().disabled).toBe(false);
    });

    it('success_reloads_the_list_and_links_to_the_trade_list', async () => {
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText('Access ended')).toBeTruthy();
      expect(screen.getByText('op-123')).toBeTruthy();
      await waitFor(() => expect(mocks.users).toHaveBeenCalledTimes(2));

      fireEvent.click(screen.getByRole('button', { name: 'Review confirmed and delivered trades' }));
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledWith('user-1'));
      expect(await screen.findByText('trade-ordinary')).toBeTruthy();
    });

    it('conflict_refreshes_and_requires_new_confirmation', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('changed', 409, 'OFFBOARD_MEMBERSHIP_CHANGED'));
      mocks.offboardingPreview
        .mockResolvedValueOnce(memberPreview)
        .mockResolvedValueOnce({ ...detachedPreview, user_id: 'user-1', email: 'mei@northstar.example' });
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/changed while you were reviewing it/)).toBeTruthy();
      // The list and the preview were both read again.
      await waitFor(() => expect(mocks.offboardingPreview).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(mocks.users).toHaveBeenCalledTimes(2));
      await screen.findByText('No company (detached)');
      // The earlier confirmation is void: nothing was repeated and the new one is required.
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText(/I understand that access ends/) as HTMLInputElement).checked).toBe(false);
      expect(confirmButton().disabled).toBe(true);

      tickConfirmation();
      fireEvent.click(confirmButton());
      await waitFor(() => expect(mocks.offboardUser).toHaveBeenCalledTimes(2));
      expect(mocks.offboardUser.mock.calls[1][1].expected_organization_id).toBeNull();
    });

    it('duplicate_completion_is_reported_without_a_second_change', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('done', 409, 'OFFBOARD_ALREADY_COMPLETED'));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/already offboarded/)).toBeTruthy();
      await waitFor(() => expect(mocks.users).toHaveBeenCalledTimes(2));
      expect(screen.queryByRole('button', { name: 'Offboard member' })).toBeNull();
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Review confirmed and delivered trades' })).toBeTruthy();
    });

    it('unknown_outcome_rereads_user_without_repeat', async () => {
      // 503 COMMIT_OUTCOME_UNKNOWN reaches the dialog as an unknown outcome.
      mocks.offboardUser.mockRejectedValueOnce(
        new ApiOutcomeUnknownError(new ApiError('unknown', 503, 'COMMIT_OUTCOME_UNKNOWN')),
      );
      mocks.offboardingPreview
        .mockResolvedValueOnce(memberPreview)
        .mockResolvedValueOnce({
          ...memberPreview,
          status: 'REJECTED',
          organization_id: null,
          organization_name: null,
          offboarded_at: '2026-11-02T10:00:00Z',
        });
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/did not confirm the result/)).toBeTruthy();
      // The offboarding preview is the single-user read: it carries the marker.
      await waitFor(() => expect(mocks.offboardingPreview).toHaveBeenCalledTimes(2));
      const record = await screen.findByTestId('offboard-reread');
      expect(await within(record).findByText(/Offboarded on/)).toBeTruthy();
      await waitFor(() => expect(mocks.users).toHaveBeenCalledTimes(2));

      // Nothing sends the command again, now or later; confirmation is gone.
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: 'Offboard member' })).toBeNull();

      // Checking again reads only; it never submits.
      fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
      await waitFor(() => expect(mocks.offboardingPreview).toHaveBeenCalledTimes(3));
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
    });

    it('unknown_outcome_without_the_marker_says_the_member_is_not_offboarded', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiOutcomeUnknownError(new Error('network')));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      const record = await screen.findByTestId('offboard-reread');
      expect(await within(record).findByText(/No completed offboarding is visible yet/)).toBeTruthy();
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
    });

    it('a_preview_with_the_marker_shows_the_member_as_already_offboarded', async () => {
      mocks.offboardingPreview.mockResolvedValue({
        ...memberPreview,
        status: 'REJECTED',
        organization_id: null,
        organization_name: null,
        offboarded_at: '2026-11-02T10:00:00Z',
      });
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: 'Offboard member mei@northstar.example' }));
      expect(await screen.findByText(/already offboarded/)).toBeTruthy();
      expect(screen.queryByLabelText('Reason')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Offboard member' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Review confirmed and delivered trades' })).toBeTruthy();
    });

    it('frozen_pending_trades_block_the_command', async () => {
      mocks.offboardingPreview.mockResolvedValue({ ...memberPreview, pending_trades: 2, frozen_pending_trades: 1 });
      renderUsers();

      await openOffboardDialog();
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('offboard-count-frozenPendingTrades').textContent).toBe('1');
      expect(within(dialog).getByRole('alert').textContent).toMatch(/blocked until the freeze/);

      // Every field can be filled, and the command still cannot be sent.
      fillOffboardForm();
      tickConfirmation();
      expect(confirmButton().disabled).toBe(true);
      fireEvent.click(confirmButton());
      expect(mocks.offboardUser).not.toHaveBeenCalled();

      // Reading the details again is the way to find that the freeze is gone.
      mocks.offboardingPreview.mockResolvedValue(memberPreview);
      fireEvent.click(screen.getByRole('button', { name: 'Reload details' }));
      await waitFor(() => expect(mocks.offboardingPreview).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(within(screen.getByRole('dialog')).queryByRole('alert')).toBeNull());
      fillOffboardForm();
      tickConfirmation();
      expect(confirmButton().disabled).toBe(false);
    });

    it('capped_informational_counts_are_shown_as_a_lower_bound', async () => {
      mocks.offboardingPreview.mockResolvedValue({
        ...memberPreview,
        confirmed_trades: 100,
        delivered_trades: 100,
        informational_counts_capped: true,
      });
      renderUsers();

      await openOffboardDialog();
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('offboard-count-confirmedTrades').textContent).toBe('100+');
      expect(within(dialog).getByTestId('offboard-count-deliveredTrades').textContent).toBe('100+');
      // A capped informational count never blocks the command.
      fillOffboardForm();
      tickConfirmation();
      expect(confirmButton().disabled).toBe(false);
    });

    it('a_busy_market_keeps_the_form_and_sends_nothing_again', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('busy', 409, 'MARKET_BUSY'));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/busy right now. Nothing was changed/)).toBeTruthy();
      // A definite refusal: the form stays as it was and nothing repeats on its own.
      expect((screen.getByLabelText(/I understand that access ends/) as HTMLInputElement).checked).toBe(true);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
      expect(mocks.offboardingPreview).toHaveBeenCalledTimes(1);
    });

    it('a_frozen_trade_found_by_the_command_refreshes_the_details', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('frozen', 409, 'MARKET_INVALIDATION_TRADE_FROZEN'));
      mocks.offboardingPreview
        .mockResolvedValueOnce(memberPreview)
        .mockResolvedValueOnce({ ...memberPreview, frozen_pending_trades: 1 });
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      await waitFor(() => expect(mocks.offboardingPreview).toHaveBeenCalledTimes(2));
      expect(await screen.findByText(/A pending trade of this member is frozen/)).toBeTruthy();
      expect(await screen.findByTestId('offboard-count-frozenPendingTrades')).toBeTruthy();
      expect(confirmButton().disabled).toBe(true);
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
    });

    it('too_many_open_items_are_explained_and_nothing_repeats', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('too many', 409, 'MARKET_INVALIDATION_LIMIT'));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/more than 100 open orders or pending trades/)).toBeTruthy();
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
    });

    it('a_preview_over_the_limit_is_explained_and_blocks_the_command', async () => {
      mocks.offboardingPreview.mockRejectedValueOnce(new ApiError('limit', 409, 'OFFBOARD_PREVIEW_LIMIT'));
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: 'Offboard member mei@northstar.example' }));
      expect(await screen.findByText(/more than 100 open orders or pending trades/)).toBeTruthy();
      expect(confirmButton().disabled).toBe(true);
    });

    it('unknown_outcome_start_over_needs_fresh_details_and_new_confirmation', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiOutcomeUnknownError(new Error('network')));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());
      await screen.findByTestId('offboard-reread');

      fireEvent.click(screen.getByRole('button', { name: 'Start over with fresh details' }));
      // Opening, the read after the unknown result, and the fresh start.
      await waitFor(() => expect(mocks.offboardingPreview).toHaveBeenCalledTimes(3));
      await screen.findByText('Advisory counts');
      expect((screen.getByLabelText(/I understand that access ends/) as HTMLInputElement).checked).toBe(false);
      expect(confirmButton().disabled).toBe(true);
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('trade handover', () => {
    const openTradeList = async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Handover trades for mei@northstar.example' }));
      await screen.findByText('trade-ordinary');
    };

    beforeEach(() => {
      mocks.offboardingTrades.mockResolvedValue(tradePage([ordinaryTrade, frozenTrade, assistedTrade]));
      mocks.users.mockResolvedValue({
        total: 5,
        items: [{ ...member, status: 'REJECTED', organization_id: null, org_name: null }, colleague, detached, otherAdmin],
      });
    });

    it('reassignment_requires_confirmation_and_displays_freeze_or_manual_resolution', async () => {
      renderUsers();
      await openTradeList();

      // Freeze and manual resolution are shown and those rows cannot be reassigned.
      expect(screen.getByText('Frozen')).toBeTruthy();
      expect(screen.getByText('Manual resolution required')).toBeTruthy();
      expect((screen.getByRole('button', { name: 'Reassign trade trade-frozen' }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: 'Reassign trade trade-assisted' }) as HTMLButtonElement).disabled).toBe(true);

      // The ordinary trade needs a replacement, a reference and a confirmation.
      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      expect(await screen.findByText(/Only the responsible person changes/)).toBeTruthy();
      const submit = () => screen.getByRole('button', { name: 'Reassign' }) as HTMLButtonElement;
      expect(submit().disabled).toBe(true);

      // Only a member of the same company and side is offered.
      const replacement = screen.getByLabelText('Replacement') as HTMLSelectElement;
      expect(within(replacement).getByRole('option', { name: /Lena Ortiz/ })).toBeTruthy();
      expect(within(replacement).queryByRole('option', { name: /Omar Aziz/ })).toBeNull();
      expect(within(replacement).queryByRole('option', { name: /Ops Admin/ })).toBeNull();
      expect(within(replacement).queryByRole('option', { name: /Mei Tan/ })).toBeNull();

      fireEvent.change(replacement, { target: { value: 'user-4' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'CASE-2026/55' } });
      expect(submit().disabled).toBe(true);
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      expect(submit().disabled).toBe(false);
      expect(mocks.reassignResponsible).not.toHaveBeenCalled();

      fireEvent.click(submit());
      await waitFor(() => expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1));
      expect(mocks.reassignResponsible).toHaveBeenCalledWith('trade-ordinary', {
        side: 'BUYER',
        replacement_user_id: 'user-4',
        evidence_case_ref: 'CASE-2026/55',
        expected_current_user_id: 'user-1',
      });
      // The list is read again after the change.
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('The responsible person was changed.')).toBeTruthy();
    });

    it('manual_resolution_refusal_is_shown_and_not_repeated', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(
        new ApiError('refused', 409, 'REASSIGNMENT_MANUAL_RESOLUTION_REQUIRED'),
      );
      renderUsers();
      await openTradeList();

      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      fireEvent.change(await screen.findByLabelText('Replacement'), { target: { value: 'user-4' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'CASE-56' } });
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      fireEvent.click(screen.getByRole('button', { name: 'Reassign' }));

      expect(await screen.findByText(/cannot be reassigned here/)).toBeTruthy();
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
    });

    it('stale_reassignment_refreshes_the_list_and_drops_the_confirmation', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('stale', 409, 'REASSIGNMENT_STALE'));
      renderUsers();
      await openTradeList();

      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      fireEvent.change(await screen.findByLabelText('Replacement'), { target: { value: 'user-4' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'CASE-57' } });
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      fireEvent.click(screen.getByRole('button', { name: 'Reassign' }));

      expect(await screen.findByText(/trade changed while you were reviewing it/)).toBeTruthy();
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      // Back on the list: a new confirmation is needed to try again.
      expect(screen.queryByLabelText(/I verified the company's request/)).toBeNull();
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
    });

    it('unknown_reassignment_outcome_rereads_the_list_without_repeat', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiOutcomeUnknownError(new Error('timeout')));
      renderUsers();
      await openTradeList();

      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      fireEvent.change(await screen.findByLabelText('Replacement'), { target: { value: 'user-4' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'CASE-58' } });
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      fireEvent.click(screen.getByRole('button', { name: 'Reassign' }));

      expect(await screen.findByText(/did not confirm the result/)).toBeTruthy();
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
    });

    it('shows_that_no_eligible_replacement_is_listed', async () => {
      mocks.users.mockResolvedValue({
        total: 2,
        items: [{ ...member, status: 'REJECTED', organization_id: null, org_name: null }, { ...colleague, role: 'SUPPLIER' }],
      });
      renderUsers();
      await openTradeList();

      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      expect(await screen.findByText(/No eligible replacement is listed/)).toBeTruthy();
    });

    const submitReassignment = async (caseRef = 'CASE-60') => {
      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      fireEvent.change(await screen.findByLabelText('Replacement'), { target: { value: 'user-4' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: caseRef } });
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      fireEvent.click(screen.getByRole('button', { name: 'Reassign' }));
    };

    it('lists_the_recorded_company_and_the_departed_person_from_the_real_list_shape', async () => {
      mocks.offboardingTrades.mockResolvedValue(tradePage([ordinaryTrade]));
      mocks.users.mockResolvedValue({
        total: 3,
        items: [{ ...member, status: 'REJECTED', organization_id: null, org_name: null }, colleague],
      });
      renderUsers();
      await openTradeList();

      const row = screen.getByText('trade-ordinary').closest('tr') as HTMLElement;
      // The side carries only the recorded organization id: the name comes from the members read.
      expect(within(row).getByText('Northstar Shipping')).toBeTruthy();
      expect(within(row).getByText('mei@northstar.example')).toBeTruthy();
      expect(within(row).getByText('Buyer')).toBeTruthy();
    });

    it('offers_a_supplier_for_the_seller_side_and_a_buyer_for_the_buyer_side', async () => {
      const supplierColleague = { ...colleague, id: 'user-6', email: 'sam@northstar.example', first_name: 'Sam', role: 'SUPPLIER' };
      mocks.offboardingTrades.mockResolvedValue(tradePage([ordinaryTrade, sellerTrade]));
      mocks.users.mockResolvedValue({
        total: 3,
        items: [{ ...member, status: 'REJECTED', organization_id: null, org_name: null }, colleague, supplierColleague],
      });
      renderUsers();
      await openTradeList();

      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-seller' }));
      let replacement = await screen.findByLabelText('Replacement') as HTMLSelectElement;
      expect(within(replacement).getByRole('option', { name: /Sam/ })).toBeTruthy();
      expect(within(replacement).queryByRole('option', { name: /Lena/ })).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      replacement = await screen.findByLabelText('Replacement') as HTMLSelectElement;
      expect(within(replacement).getByRole('option', { name: /Lena/ })).toBeTruthy();
      expect(within(replacement).queryByRole('option', { name: /Sam/ })).toBeNull();
    });

    it('sends_the_seller_side_as_it_was_listed', async () => {
      const supplierColleague = { ...colleague, id: 'user-6', email: 'sam@northstar.example', first_name: 'Sam', role: 'SUPPLIER' };
      mocks.offboardingTrades.mockResolvedValue(tradePage([sellerTrade]));
      mocks.users.mockResolvedValue({
        total: 2,
        items: [{ ...member, status: 'REJECTED', organization_id: null, org_name: null }, supplierColleague],
      });
      renderUsers();
      fireEvent.click(await screen.findByRole('button', { name: 'Handover trades for mei@northstar.example' }));
      await screen.findByText('trade-seller');

      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-seller' }));
      fireEvent.change(await screen.findByLabelText('Replacement'), { target: { value: 'user-6' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'TICKET-8841' } });
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      fireEvent.click(screen.getByRole('button', { name: 'Reassign' }));

      await waitFor(() => expect(mocks.reassignResponsible).toHaveBeenCalledWith('trade-seller', {
        side: 'SELLER',
        replacement_user_id: 'user-6',
        evidence_case_ref: 'TICKET-8841',
        expected_current_user_id: 'user-1',
      }));
    });

    it('a_case_reference_outside_the_grammar_blocks_the_reassignment', async () => {
      renderUsers();
      await openTradeList();

      fireEvent.click(screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }));
      fireEvent.change(await screen.findByLabelText('Replacement'), { target: { value: 'user-4' } });
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'ticket-77' } });
      expect((screen.getByRole('button', { name: 'Reassign' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText(/Use CASE, REQ, SEC or TICKET/)).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'REQ-77' } });
      expect((screen.getByRole('button', { name: 'Reassign' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('a_list_longer_than_the_page_says_so', async () => {
      mocks.offboardingTrades.mockResolvedValue(tradePage([ordinaryTrade], { total: 130 }));
      renderUsers();
      await openTradeList();
      expect(screen.getByText(/The list is limited/)).toBeTruthy();
    });

    it('a_list_for_another_account_is_refused', async () => {
      mocks.offboardingTrades.mockResolvedValue(tradePage([ordinaryTrade], { user_id: 'user-9' }));
      renderUsers();
      fireEvent.click(await screen.findByRole('button', { name: 'Handover trades for mei@northstar.example' }));
      expect(await screen.findByText('Could not load the trades.')).toBeTruthy();
      expect(screen.queryByText('trade-ordinary')).toBeNull();
    });

    it('a_trade_that_changed_state_refreshes_the_list', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('state', 409, 'TRADE_NOT_REASSIGNABLE'));
      renderUsers();
      await openTradeList();

      await submitReassignment();
      expect(await screen.findByText(/can no longer be reassigned/)).toBeTruthy();
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      expect(screen.queryByLabelText(/I verified the company's request/)).toBeNull();
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
    });

    it('a_frozen_refusal_refreshes_the_list_and_shows_the_freeze', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('frozen', 409, 'TRADE_FROZEN'));
      mocks.offboardingTrades
        .mockResolvedValueOnce(tradePage([ordinaryTrade]))
        .mockResolvedValueOnce(tradePage([{ ...ordinaryTrade, frozen: true }]));
      renderUsers();
      await openTradeList();

      await submitReassignment();
      expect(await screen.findByText(/This trade is frozen/)).toBeTruthy();
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      await screen.findByText('Frozen');
      expect((screen.getByRole('button', { name: 'Reassign trade trade-ordinary' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('a_person_who_is_still_a_member_is_explained', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('member', 409, 'REASSIGNMENT_CURRENT_STILL_MEMBER'));
      renderUsers();
      await openTradeList();

      await submitReassignment();
      expect(await screen.findByText(/still a member of the company/)).toBeTruthy();
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
    });

    it('an_ineligible_replacement_keeps_the_form_and_reads_the_members_again', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('no', 409, 'REASSIGNMENT_REPLACEMENT_INELIGIBLE'));
      renderUsers();
      await openTradeList();
      const memberReads = mocks.users.mock.calls.length;

      await submitReassignment();
      expect(await screen.findByText(/cannot take over this trade side/)).toBeTruthy();
      // The form stays so another person can be chosen; the choice and the confirmation are cleared.
      expect((screen.getByLabelText('Replacement') as HTMLSelectElement).value).toBe('');
      expect((screen.getByLabelText(/I verified the company's request/) as HTMLInputElement).checked).toBe(false);
      await waitFor(() => expect(mocks.users.mock.calls.length).toBeGreaterThan(memberReads));
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
    });

    it('a_busy_market_keeps_the_reassignment_form_and_sends_nothing_again', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('busy', 409, 'MARKET_BUSY'));
      renderUsers();
      await openTradeList();

      await submitReassignment();
      expect(await screen.findByText(/busy right now. Nothing was changed/)).toBeTruthy();
      expect((screen.getByLabelText(/I verified the company's request/) as HTMLInputElement).checked).toBe(true);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
    });

    it('a_missing_trade_refreshes_the_list', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('gone', 404, 'TRADE_NOT_FOUND'));
      renderUsers();
      await openTradeList();

      await submitReassignment();
      expect(await screen.findByText(/trade was not found/)).toBeTruthy();
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
    });

    it('a_commit_outcome_unknown_response_reads_the_list_and_never_repeats', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(
        new ApiOutcomeUnknownError(new ApiError('unknown', 503, 'COMMIT_OUTCOME_UNKNOWN')),
      );
      renderUsers();
      await openTradeList();

      await submitReassignment();
      expect(await screen.findByText(/did not confirm the result/)).toBeTruthy();
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
    });

    it('a_rate_limited_reassignment_keeps_the_form_shows_the_wait_and_sends_nothing_again', async () => {
      // The served routes answer 429 RATE_LIMITED with Retry-After before the handler runs.
      mocks.reassignResponsible.mockRejectedValueOnce(
        new ApiError('Rate limit exceeded', 429, 'RATE_LIMITED', undefined, 60),
      );
      renderUsers();
      await openTradeList();

      await submitReassignment();
      expect(await screen.findByText(/Too many administrator requests. Nothing was changed. Wait 60 seconds/)).toBeTruthy();
      expect((screen.getByLabelText(/I verified the company's request/) as HTMLInputElement).checked).toBe(true);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1);
      expect(mocks.offboardingTrades).toHaveBeenCalledTimes(1);
    });
  });

  describe('composed route outcomes', () => {
    it('a_rate_limited_command_keeps_the_form_shows_the_wait_and_sends_nothing_again', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('Rate limit exceeded', 429, 'RATE_LIMITED', undefined, 60));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/Too many administrator requests. Nothing was changed. Wait 60 seconds/)).toBeTruthy();
      // The limiter refused before the handler: the form and the confirmation stay, nothing repeats.
      expect((screen.getByLabelText(/I understand that access ends/) as HTMLInputElement).checked).toBe(true);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
      expect(mocks.offboardingPreview).toHaveBeenCalledTimes(1);
    });

    it('a_rate_limit_without_a_wait_still_says_nothing_was_changed', async () => {
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('Rate limit exceeded', 429, 'RATE_LIMITED'));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/Too many administrator requests. Nothing was changed. Wait a minute/)).toBeTruthy();
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
    });

    it('a_rate_limited_preview_explains_the_wait_and_blocks_the_command', async () => {
      mocks.offboardingPreview.mockRejectedValueOnce(new ApiError('Rate limit exceeded', 429, 'RATE_LIMITED', undefined, 60));
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: 'Offboard member mei@northstar.example' }));
      expect(await screen.findByText(/Wait 60 seconds/)).toBeTruthy();
      expect(confirmButton().disabled).toBe(true);
    });

    it('a_busy_market_then_a_manual_repeat_commits_once', async () => {
      // MARKET_BUSY rolled everything back; only the administrator's own second click sends again.
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('busy', 409, 'MARKET_BUSY'));
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());
      expect(await screen.findByText(/busy right now. Nothing was changed/)).toBeTruthy();
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);

      fireEvent.click(confirmButton());
      expect(await screen.findByText('Access ended')).toBeTruthy();
      expect(mocks.offboardUser).toHaveBeenCalledTimes(2);
      expect(mocks.offboardUser.mock.calls[1]).toEqual(mocks.offboardUser.mock.calls[0]);
    });

    it('an_unknown_outcome_without_a_commit_needs_a_fresh_confirmation_before_one_more_send', async () => {
      // A session that ends at COMMIT answers 503 COMMIT_OUTCOME_UNKNOWN; the user read decides.
      mocks.offboardUser
        .mockRejectedValueOnce(new ApiOutcomeUnknownError(new ApiError('unknown', 503, 'COMMIT_OUTCOME_UNKNOWN')))
        .mockResolvedValueOnce(offboardResult);
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      const record = await screen.findByTestId('offboard-reread');
      expect(await within(record).findByText(/No completed offboarding is visible yet/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Start over with fresh details' }));
      await screen.findByText('Advisory counts');
      expect(confirmButton().disabled).toBe(true);
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);

      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());
      expect(await screen.findByText('Access ended')).toBeTruthy();
      expect(mocks.offboardUser).toHaveBeenCalledTimes(2);
    });

    it('the_order_count_names_open_orders_and_orders_linked_to_pending_trades', async () => {
      renderUsers();

      await openOffboardDialog();
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Orders to withdraw (open, or linked to a pending trade)')).toBeTruthy();
      expect(within(dialog).queryByText('Open orders owned')).toBeNull();
    });
  });

  describe('localized errors', () => {
    it('maps_known_codes_in_english_and_chinese', async () => {
      await loadNamespace('admin');
      await act(async () => { await i18n.changeLanguage('zh'); });
      mocks.offboardingTrades.mockResolvedValue(tradePage([ordinaryTrade]));
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('Trade is frozen', 409, 'TRADE_FROZEN'));
      mocks.users.mockResolvedValue({
        total: 2,
        items: [{ ...member, status: 'REJECTED', organization_id: null, org_name: null }, colleague],
      });
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: /交接.*mei@northstar.example/ }));
      await screen.findByText('trade-ordinary');
      fireEvent.click(screen.getByRole('button', { name: /trade-ordinary/ }));
      fireEvent.change(await screen.findByLabelText('替代人员'), { target: { value: 'user-4' } });
      fireEvent.change(screen.getByLabelText('案件编号'), { target: { value: 'CASE-1' } });
      fireEvent.click(screen.getByRole('checkbox'));
      const dialog = screen.getByRole('dialog');
      const buttons = within(dialog).getAllByRole('button');
      fireEvent.click(buttons[buttons.length - 1]);

      // The trade-frozen refusal arrives in Chinese, never as the English server text.
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('冻结'));
      expect(screen.getByRole('alert').textContent).not.toContain('Trade is frozen');
    });

    it('does_not_expose_unmapped_server_text_in_chinese', async () => {
      await loadNamespace('admin');
      await act(async () => { await i18n.changeLanguage('zh'); });
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('Internal detail leaked', 422, 'SOMETHING_NEW'));
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: /mei@northstar.example/ }));
      await screen.findByTestId('offboard-count-openOrders');
      fireEvent.change(screen.getByLabelText('原因'), { target: { value: 'COMPANY_REQUEST' } });
      fireEvent.change(screen.getByLabelText('案件编号'), { target: { value: 'CASE-2' } });
      fireEvent.click(screen.getByRole('checkbox', { name: /我了解/ }));
      const dialog = screen.getByRole('dialog');
      const buttons = within(dialog).getAllByRole('button');
      fireEvent.click(buttons[buttons.length - 1]);

      await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
      expect(screen.getByRole('alert').textContent).not.toContain('Internal detail leaked');
      expect(screen.getByRole('alert').textContent).toContain('无法');
    });

    it('every_refusal_code_has_an_english_and_a_chinese_message', async () => {
      await loadNamespace('admin');
      const english = i18n.getFixedT('en', 'admin');
      const chinese = i18n.getFixedT('zh', 'admin');
      expect(OFFBOARDING_ERROR_CODES.length).toBeGreaterThanOrEqual(30);
      for (const code of OFFBOARDING_ERROR_CODES) {
        const key = `offboard.errorCode.${code}`;
        const en = english(key, { defaultValue: '' });
        const zh = chinese(key, { defaultValue: '' });
        expect(en, `${code} (en)`).not.toBe('');
        expect(zh, `${code} (zh)`).not.toBe('');
        // The Chinese text is a translation, never a copy of the English text.
        expect(zh, `${code} (zh)`).not.toBe(en);
        expect(/[\u4e00-\u9fff]/.test(zh), `${code} (zh script)`).toBe(true);
      }
    });

    it('names_every_refusal_code_the_two_backend_routes_can_send', () => {
      for (const code of [
        // account offboarding command and preview
        'ADMIN_REQUIRED', 'ACCOUNT_NOT_MANAGEABLE', 'USER_NOT_FOUND', 'VALIDATION_FAILED', 'BODY_TOO_LARGE',
        'OFFBOARD_ALREADY_COMPLETED', 'OFFBOARD_MEMBERSHIP_CHANGED', 'OFFBOARD_PREVIEW_LIMIT',
        'MARKET_INVALIDATION_LIMIT', 'MARKET_INVALIDATION_TRADE_FROZEN', 'MARKET_SUPPORT_MUTATION_NOT_ALLOWED',
        'ACCOUNT_STATE_INVALID',
        // reassignment and the obligation list
        'FORBIDDEN', 'TRADE_NOT_FOUND', 'REASSIGNMENT_STALE', 'TRADE_NOT_REASSIGNABLE', 'TRADE_FROZEN',
        'REASSIGNMENT_MANUAL_RESOLUTION_REQUIRED', 'REASSIGNMENT_CURRENT_STILL_MEMBER',
        'REASSIGNMENT_REPLACEMENT_INELIGIBLE',
        // contention, outcome and sign-in refusals of both
        'MARKET_BUSY', 'MARKET_TIMEOUT', 'TRANSACTION_TIMEOUT', 'TRANSACTION_RETRY_EXHAUSTED',
        'COMMIT_OUTCOME_UNKNOWN', 'DATABASE_ERROR', 'EXECUTION_NOT_AVAILABLE',
        'AUTH_CREDENTIALS_INVALID', 'INVALID_CREDENTIALS', 'AUTH_SESSION_REVOKED', 'AUTH_PASSWORD_CHANGED',
        'ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'PASSWORD_CHANGE_REQUIRED',
        // the shared administrator quota in front of all four routes
        'RATE_LIMITED',
        // refused by this client before a request is sent
        'MARKET_SUPPORT_MUTATION_BLOCKED',
      ]) {
        expect(OFFBOARDING_ERROR_CODES, code).toContain(code);
      }
    });

    it('shows_a_clear_message_when_the_route_is_not_available', async () => {
      mocks.offboardingPreview.mockRejectedValueOnce(new ApiError('Not Found', 404, null));
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: 'Offboard member mei@northstar.example' }));
      expect(await screen.findByText('Offboarding is not available right now.')).toBeTruthy();
      expect(confirmButton().disabled).toBe(true);
    });

    it('treats_405_from_a_dormant_route_as_not_available', async () => {
      mocks.offboardingPreview.mockRejectedValueOnce(new ApiError('Method Not Allowed', 405, null));
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: 'Offboard member mei@northstar.example' }));
      expect(await screen.findByText('Offboarding is not available right now.')).toBeTruthy();
    });
  });
});

// The component tests above replace the admin calls; these exercise the real client
// against the response shapes the Rust routes send.
describe('offboarding api contract', () => {
  let apiModule: typeof import('../services/api');
  let api: typeof import('../services/api')['api'];

  beforeAll(async () => {
    apiModule = await vi.importActual<typeof import('../services/api')>('../services/api');
    api = apiModule.api;
  });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  describe('release switch', () => {
    it('is_off_unless_the_build_sets_it_to_true', async () => {
      const { isOffboardingEnabled } = await import('../components/admin/offboardingAccess');
      vi.stubEnv('VITE_OFFBOARDING_ENABLED', undefined as unknown as string);
      expect(isOffboardingEnabled()).toBe(false);
      for (const value of ['', 'false', '0', '1', 'yes', 'TRUE']) {
        vi.stubEnv('VITE_OFFBOARDING_ENABLED', value);
        expect(isOffboardingEnabled(), value).toBe(false);
      }
      vi.stubEnv('VITE_OFFBOARDING_ENABLED', 'true');
      expect(isOffboardingEnabled()).toBe(true);
      vi.unstubAllEnvs();
    });
  });

  describe('reason codes and case reference', () => {
    it('offers_exactly_the_four_reason_codes_the_backend_accepts', () => {
      expect([...apiModule.OFFBOARD_REASON_CODES]).toEqual([
        'EMPLOYMENT_ENDED',
        'COMPANY_REQUEST',
        'SECURITY_CONCERN',
        'ACCOUNT_HOLDER_REQUEST',
      ]);
    });

    it('accepts_the_ticket_grammar_of_the_backend', () => {
      for (const reference of [
        'CASE-2026/0042',
        'SEC-2026-11-0001',
        'REQ-1',
        'TICKET-123456789012',
        'CASE-1/2-3',
        `CASE-${'9'.repeat(12)}-${'8'.repeat(12)}/${'7'.repeat(12)}`,
      ]) {
        expect(apiModule.isValidCaseReference(reference), reference).toBe(true);
      }
    });

    it('refuses_values_outside_the_ticket_grammar', () => {
      for (const reference of [
        '',
        'CASE',
        'CASE-',
        'case-2026/0042',
        'JIRA-123',
        'CASE-ABC',
        'CASE-12A',
        'CASE-2026-',
        'CASE--2026',
        'CASE-1-2-3-4',
        'CASE-1234567890123',
        'CASE 2026',
        'CASE-2026 ',
        'CASE-2026/0042@example.com',
        'CASE-1.2',
        'CASE-１２３',
        'Jane Doe',
        `CASE-${'1'.repeat(65)}`,
      ]) {
        expect(apiModule.isValidCaseReference(reference), JSON.stringify(reference)).toBe(false);
      }
    });
  });

  describe('offboard command', () => {
    it('sends_an_explicit_null_organization_and_exactly_the_four_fields', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json({ ...offboardResult, user_id: 'user-2', former_organization_id: null }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await api.admin.offboardUser('user-2', {
        reason_code: 'ACCOUNT_HOLDER_REQUEST',
        evidence_case_ref: 'CASE-2026/0042',
        urgent: false,
        expected_organization_id: null,
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/auth\/admin\/users\/user-2\/offboard$/);
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{"reason_code":"ACCOUNT_HOLDER_REQUEST","evidence_case_ref":"CASE-2026/0042","urgent":false,"expected_organization_id":null}');
      expect(result).toEqual({
        operation_id: 'op-123',
        user_id: 'user-2',
        former_organization_id: null,
        status: 'REJECTED',
        offboarded_at: '2026-11-02T10:00:00Z',
      });
    });

    it('reads_the_committed_response_with_the_status_and_the_database_time', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(offboardResult)));
      await expect(api.admin.offboardUser('user-1', {
        reason_code: 'EMPLOYMENT_ENDED',
        evidence_case_ref: 'REQ-4',
        urgent: true,
        expected_organization_id: 'org-1',
      })).resolves.toEqual(offboardResult);
    });

    it('treats_503_commit_outcome_unknown_as_an_unknown_outcome', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: { code: 'COMMIT_OUTCOME_UNKNOWN', message: 'check' } }, 503)));
      await expect(api.admin.offboardUser('user-1', {
        reason_code: 'COMPANY_REQUEST',
        evidence_case_ref: 'CASE-4',
        urgent: false,
        expected_organization_id: 'org-1',
      })).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
    });

    it('keeps_the_refusal_code_of_a_409', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: { code: 'OFFBOARD_MEMBERSHIP_CHANGED', message: 'x' } }, 409)));
      const failure = await api.admin.offboardUser('user-1', {
        reason_code: 'COMPANY_REQUEST',
        evidence_case_ref: 'CASE-4',
        urgent: false,
        expected_organization_id: 'org-1',
      }).catch((cause: unknown) => cause);
      expect(failure).toBeInstanceOf(ApiError);
      expect((failure as ApiError).code).toBe('OFFBOARD_MEMBERSHIP_CHANGED');
    });
  });

  describe('preview', () => {
    it('reads_every_field_of_the_preview', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json({ ...memberPreview, frozen_pending_trades: 1, informational_counts_capped: true }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(api.admin.offboardingPreview('user-1')).resolves.toEqual({
        ...memberPreview,
        frozen_pending_trades: 1,
        informational_counts_capped: true,
      });
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/admin\/users\/user-1\/offboarding-preview$/);
    });

    it('refuses_a_response_without_the_organization_field', async () => {
      // A missing key is not the same as "no company".
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...memberPreview, organization_id: undefined })));
      await expect(api.admin.offboardingPreview('user-1')).rejects.toBeInstanceOf(ApiError);
    });

    it('refuses_a_response_without_the_frozen_pending_count', async () => {
      // The blocker must never be read as zero because the key is missing.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...memberPreview, frozen_pending_trades: undefined })));
      await expect(api.admin.offboardingPreview('user-1')).rejects.toBeInstanceOf(ApiError);
    });

    it('refuses_a_response_without_the_offboarding_marker_field', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...memberPreview, offboarded_at: undefined })));
      await expect(api.admin.offboardingPreview('user-1')).rejects.toBeInstanceOf(ApiError);
    });

    it('refuses_the_names_of_the_earlier_assumed_shape', async () => {
      const { open_owned_orders, pending_trades, confirmed_trades, delivered_trades, ...rest } = memberPreview;
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({
        ...rest,
        open_order_count: open_owned_orders,
        pending_trade_count: pending_trades,
        confirmed_trade_count: confirmed_trades,
        delivered_trade_count: delivered_trades,
      })));
      await expect(api.admin.offboardingPreview('user-1')).rejects.toBeInstanceOf(ApiError);
    });

    it('refuses_counts_that_are_not_whole_numbers', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...memberPreview, open_owned_orders: -1 })));
      await expect(api.admin.offboardingPreview('user-1')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('obligation list', () => {
    it('reads_the_list_with_total_skip_and_limit', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json(rawTradePage([ordinaryTrade, sellerTrade, frozenTrade], { total: 3 })));
      vi.stubGlobal('fetch', fetchMock);

      const list = await api.admin.offboardingTrades('user-1');
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/admin\/users\/user-1\/offboarding-trades$/);
      expect(list.user_id).toBe('user-1');
      expect(list.total).toBe(3);
      expect(list.truncated).toBe(false);
      expect(list.items.map(item => [item.trade_id, item.side, item.status, item.recorded_organization_id])).toEqual([
        ['trade-ordinary', 'BUYER', 'CONFIRMED', 'org-1'],
        ['trade-seller', 'SELLER', 'CONFIRMED', 'org-1'],
        ['trade-frozen', 'BUYER', 'DELIVERED', 'org-1'],
      ]);
      expect(list.items[2].frozen).toBe(true);
    });

    it('is_truncated_when_the_total_is_above_the_page', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(rawTradePage([ordinaryTrade], { total: 101 }))));
      expect((await api.admin.offboardingTrades('user-1')).truncated).toBe(true);
    });

    it('treats_a_missing_freeze_or_manual_resolution_indicator_as_blocking', async () => {
      const { frozen: _frozen, manual_resolution_required: _manual, ...bare } = ordinaryTrade;
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(rawTradePage([bare]))));

      const list = await api.admin.offboardingTrades('user-1');
      expect(list.items[0].frozen).toBe(true);
      expect(list.items[0].manual_resolution_required).toBe(true);
    });

    it('refuses_a_side_or_a_recorded_organization_it_cannot_echo_back', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(json(rawTradePage([{ ...ordinaryTrade, side: 'buyer' }])))
        .mockResolvedValueOnce(json(rawTradePage([{ ...ordinaryTrade, recorded_organization_id: undefined }]))));
      await expect(api.admin.offboardingTrades('user-1')).rejects.toBeInstanceOf(ApiError);
      await expect(api.admin.offboardingTrades('user-1')).rejects.toBeInstanceOf(ApiError);
    });

    it('refuses_a_response_without_the_total', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ user_id: 'user-1', items: [ordinaryTrade] })));
      await expect(api.admin.offboardingTrades('user-1')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('reassignment', () => {
    it('posts_exactly_the_four_fields_and_reads_the_committed_response', async () => {
      const fetchMock = vi.fn().mockResolvedValue(json({ ...reassignResult, side: 'SELLER' }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await api.admin.reassignResponsible('trade-1', {
        side: 'SELLER',
        replacement_user_id: 'user-7',
        evidence_case_ref: 'CASE-2026/5',
        expected_current_user_id: 'user-1',
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/auth\/admin\/trades\/trade-1\/reassign-responsible$/);
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{"side":"SELLER","replacement_user_id":"user-7","evidence_case_ref":"CASE-2026/5","expected_current_user_id":"user-1"}');
      expect(result).toEqual({ ...reassignResult, side: 'SELLER' });
    });

    it('treats_a_server_failure_as_an_unknown_outcome_and_a_409_as_a_refusal', async () => {
      const input = {
        side: 'BUYER' as const,
        replacement_user_id: 'user-7',
        evidence_case_ref: 'CASE-5',
        expected_current_user_id: 'user-1',
      };
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce(json({ detail: { code: 'COMMIT_OUTCOME_UNKNOWN', message: 'x' } }, 503))
        .mockResolvedValueOnce(json({ detail: { code: 'REASSIGNMENT_CURRENT_STILL_MEMBER', message: 'x' } }, 409)));

      await expect(api.admin.reassignResponsible('trade-1', input)).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
      const refusal = await api.admin.reassignResponsible('trade-1', input).catch((cause: unknown) => cause);
      expect(refusal).toBeInstanceOf(ApiError);
      expect((refusal as ApiError).code).toBe('REASSIGNMENT_CURRENT_STILL_MEMBER');
    });
  });

  describe('composed routes', () => {
    const input = {
      reason_code: 'COMPANY_REQUEST' as const,
      evidence_case_ref: 'CASE-4',
      urgent: false,
      expected_organization_id: 'org-1',
    };
    const reassignInput = {
      side: 'BUYER' as const,
      replacement_user_id: 'user-7',
      evidence_case_ref: 'CASE-5',
      expected_current_user_id: 'user-1',
    };
    const calls = (): Array<[string, () => Promise<unknown>]> => [
      ['preview', () => api.admin.offboardingPreview('8d3c0d1e-6c0b-4c4e-9a43-1a2b3c4d5e6f')],
      ['offboard', () => api.admin.offboardUser('8d3c0d1e-6c0b-4c4e-9a43-1a2b3c4d5e6f', input)],
      ['trades', () => api.admin.offboardingTrades('8d3c0d1e-6c0b-4c4e-9a43-1a2b3c4d5e6f')],
      ['reassign', () => api.admin.reassignResponsible('5f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', reassignInput)],
    ];

    // The two matchers of deploy/caddy/rust-offboarding.caddy in the backend.
    const CADDY_GET = /^\/api\/auth\/admin\/users\/[^/]+\/(offboarding-preview|offboarding-trades)$/;
    const CADDY_POST = /^\/api\/auth\/admin\/(users\/[^/]+\/offboard|trades\/[^/]+\/reassign-responsible)$/;

    afterEach(() => {
      clearMarketSupportContextId();
    });

    it('every_call_matches_exactly_one_caddy_matcher_with_its_method_and_no_query', async () => {
      const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({}, 418)));
      vi.stubGlobal('fetch', fetchMock);
      for (const [, call] of calls()) await call().catch(() => undefined);

      expect(fetchMock).toHaveBeenCalledTimes(4);
      for (const [url, init] of fetchMock.mock.calls) {
        const parsed = new URL(String(url), 'http://frontend.test');
        expect(parsed.search, String(url)).toBe('');
        const method = (init?.method ?? 'GET').toUpperCase();
        const path = parsed.pathname.replace(/^.*?(\/api\/)/, '/api/');
        const matcher = method === 'GET' ? CADDY_GET : CADDY_POST;
        expect(method === 'GET' || method === 'POST', `${method} ${path}`).toBe(true);
        expect(matcher.test(path), `${method} ${path}`).toBe(true);
        // The other method's matcher never owns the path: Python keeps it.
        expect((method === 'GET' ? CADDY_POST : CADDY_GET).test(path), `${method} ${path}`).toBe(false);
      }
    });

    it('the_reads_carry_no_assisted_context_and_the_writes_are_blocked_inside_one', async () => {
      const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({}, 418)));
      vi.stubGlobal('fetch', fetchMock);
      setMarketSupportContextId('context-1');

      await api.admin.offboardingPreview('user-1').catch(() => undefined);
      await api.admin.offboardingTrades('user-1').catch(() => undefined);
      for (const [, init] of fetchMock.mock.calls) {
        expect(new Headers(init?.headers).has('X-Verdaxis-Market-Support-Context')).toBe(false);
      }
      const command = await api.admin.offboardUser('user-1', input).catch((cause: unknown) => cause);
      const reassign = await api.admin.reassignResponsible('trade-1', reassignInput).catch((cause: unknown) => cause);
      expect((command as ApiError).code).toBe('MARKET_SUPPORT_MUTATION_BLOCKED');
      expect((reassign as ApiError).code).toBe('MARKET_SUPPORT_MUTATION_BLOCKED');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('a_dormant_route_is_a_definite_refusal_on_every_call', async () => {
      // Rust with the switch off (404, empty body), Python behind Caddy without the
      // import (404 with a string detail), and a method the enabled router lacks (405).
      for (const response of [
        () => new Response('', { status: 404 }),
        () => json({ detail: 'Not Found' }, 404),
        () => new Response('', { status: 405 }),
      ]) {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response()));
        vi.stubGlobal('fetch', fetchMock);
        for (const [name, call] of calls()) {
          const failure = await call().catch((cause: unknown) => cause);
          expect(failure, name).toBeInstanceOf(ApiError);
          expect(failure, name).not.toBeInstanceOf(ApiOutcomeUnknownError);
          expect([404, 405], name).toContain((failure as ApiError).status);
          expect((failure as ApiError).code, name).toBeNull();
        }
        expect(fetchMock).toHaveBeenCalledTimes(4);
      }
    });

    it('a_rate_limit_is_a_definite_refusal_with_its_wait_on_every_call', async () => {
      const limited = () => new Response(
        JSON.stringify({ detail: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
      );
      const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(limited()));
      vi.stubGlobal('fetch', fetchMock);
      const waits: unknown[] = [];
      const listener = (event: Event) => waits.push((event as CustomEvent).detail.retryAfter);
      window.addEventListener('verdaxis:rate-limited', listener);
      try {
        for (const [name, call] of calls()) {
          const failure = await call().catch((cause: unknown) => cause);
          expect(failure, name).toBeInstanceOf(ApiError);
          expect(failure, name).not.toBeInstanceOf(ApiOutcomeUnknownError);
          expect((failure as ApiError).status, name).toBe(429);
          expect((failure as ApiError).code, name).toBe('RATE_LIMITED');
          expect((failure as ApiError).retryAfterSeconds, name).toBe(60);
        }
      } finally {
        window.removeEventListener('verdaxis:rate-limited', listener);
      }
      expect(waits).toEqual(['60', '60', '60', '60']);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('reads_only_whole_seconds_from_retry_after', async () => {
      for (const [header, expected] of [['1', 1], ['0', 0], ['Wed, 21 Oct 2026 07:28:00 GMT', null], ['soon', null], ['-5', null], [null, null]] as const) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (header !== null) headers['Retry-After'] = header;
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
          JSON.stringify({ detail: { code: 'RATE_LIMITED', message: 'x' } }), { status: 429, headers },
        )));
        const failure = await api.admin.offboardingPreview('user-1').catch((cause: unknown) => cause);
        expect((failure as ApiError).retryAfterSeconds, String(header)).toBe(expected);
      }
    });

    it('a_write_that_ends_in_a_server_failure_is_an_unknown_outcome_and_is_sent_once', async () => {
      // 503 COMMIT_OUTCOME_UNKNOWN has no Retry-After; 503 TRANSACTION_RETRY_EXHAUSTED has one;
      // 500 DATABASE_ERROR comes from a session ended before COMMIT. None is ever resent.
      for (const [response, waitMs] of [
        [() => json({ detail: { code: 'COMMIT_OUTCOME_UNKNOWN', message: 'x' } }, 503), 50],
        [() => new Response(JSON.stringify({ detail: { code: 'TRANSACTION_RETRY_EXHAUSTED', message: 'x' } }), {
          status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
        }), 1100],
        [() => json({ detail: { code: 'DATABASE_ERROR', message: 'x' } }, 500), 50],
      ] as const) {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response()));
        vi.stubGlobal('fetch', fetchMock);
        await expect(api.admin.offboardUser('user-1', input)).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
        await expect(api.admin.reassignResponsible('trade-1', reassignInput)).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
        // Past the Retry-After wait, nothing was sent again.
        await new Promise(resolve => setTimeout(resolve, waitMs));
        expect(fetchMock).toHaveBeenCalledTimes(2);
      }
    });

    it('a_busy_market_is_a_definite_refusal_without_a_wait', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: { code: 'MARKET_BUSY', message: 'x' } }, 409)));
      const failure = await api.admin.offboardUser('user-1', input).catch((cause: unknown) => cause);
      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).not.toBeInstanceOf(ApiOutcomeUnknownError);
      expect((failure as ApiError).code).toBe('MARKET_BUSY');
      expect((failure as ApiError).retryAfterSeconds).toBeNull();
    });
  });
});
