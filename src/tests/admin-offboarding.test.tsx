import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { ApiError, ApiOutcomeUnknownError, api } from '../services/api';
import { clearAccessToken } from '../services/authToken';
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
  organization_id: 'org-1',
  organization_name: 'Northstar Shipping',
  open_order_count: 3,
  pending_trade_count: 2,
  confirmed_trade_count: 4,
  delivered_trade_count: 1,
};

const detachedPreview = {
  ...memberPreview,
  user_id: 'user-2',
  email: 'omar@former.example',
  organization_id: null,
  organization_name: null,
  open_order_count: 0,
  pending_trade_count: 0,
  confirmed_trade_count: 0,
  delivered_trade_count: 0,
};

const ordinaryTrade = {
  trade_id: 'trade-ordinary',
  side: 'BUYER',
  status: 'CONFIRMED',
  organization_id: 'org-1',
  organization_name: 'Northstar Shipping',
  responsible_user_id: 'user-1',
  responsible_user_email: 'mei@northstar.example',
  frozen: false,
  manual_resolution_required: false,
};
const frozenTrade = { ...ordinaryTrade, trade_id: 'trade-frozen', status: 'DELIVERED', frozen: true };
const assistedTrade = { ...ordinaryTrade, trade_id: 'trade-assisted', manual_resolution_required: true };

const renderUsers = () => render(
  <MemoryRouter initialEntries={['/app/admin/users']}>
    <AdminDashboard />
  </MemoryRouter>,
);

const fillOffboardForm = (caseRef = 'CASE-2026-001') => {
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
    mocks.offboardUser.mockResolvedValue({
      operation_id: 'op-123',
      former_organization_id: 'org-1',
      state: 'OFFBOARDED',
    });
    mocks.offboardingTrades.mockResolvedValue({ items: [ordinaryTrade], truncated: false });
    mocks.reassignResponsible.mockResolvedValue({});
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
      expect(screen.getByText('No company (detached)')).toBeTruthy();

      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      await waitFor(() => expect(mocks.offboardUser).toHaveBeenCalledTimes(1));
      const [userId, input] = mocks.offboardUser.mock.calls[0];
      expect(userId).toBe('user-2');
      expect(Object.prototype.hasOwnProperty.call(input, 'expected_organization_id')).toBe(true);
      expect(input).toEqual({
        reason_code: 'COMPANY_REQUEST',
        evidence_case_ref: 'CASE-2026-001',
        urgent: false,
        expected_organization_id: null,
      });
    });

    it('submits_the_displayed_company_and_the_urgent_flag', async () => {
      renderUsers();

      await openOffboardDialog();
      expect(screen.getByText('Northstar Shipping')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'SECURITY_REPORT' } });
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: ' SEC-77 ' } });
      fireEvent.click(screen.getByLabelText(/Urgent security report/));
      tickConfirmation();
      fireEvent.click(confirmButton());

      await waitFor(() => expect(mocks.offboardUser).toHaveBeenCalledWith('user-1', {
        reason_code: 'SECURITY_REPORT',
        evidence_case_ref: 'SEC-77',
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
      expect(screen.getByText(/Use 1 to 64 letters/)).toBeTruthy();

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
      mocks.offboardUser.mockRejectedValueOnce(new ApiError('changed', 409, 'MEMBERSHIP_CHANGED'));
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
      mocks.offboardUser.mockRejectedValueOnce(new ApiOutcomeUnknownError(new ApiError('boom', 502, null)));
      mocks.users
        .mockResolvedValueOnce({ total: 1, items: [member] })
        .mockResolvedValueOnce({ total: 1, items: [{ ...member, status: 'REJECTED', organization_id: null, org_name: null }] });
      renderUsers();

      await openOffboardDialog();
      fillOffboardForm();
      tickConfirmation();
      fireEvent.click(confirmButton());

      expect(await screen.findByText(/did not confirm the result/)).toBeTruthy();
      await waitFor(() => expect(mocks.users).toHaveBeenCalledTimes(2));
      const record = await screen.findByTestId('offboard-reread');
      expect(within(record).getByText('Rejected')).toBeTruthy();

      // Nothing sends the command again, now or later; confirmation is gone.
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: 'Offboard member' })).toBeNull();

      // Checking again reads only; it never submits.
      fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
      await waitFor(() => expect(mocks.users).toHaveBeenCalledTimes(3));
      expect(mocks.offboardUser).toHaveBeenCalledTimes(1);
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
      await waitFor(() => expect(mocks.offboardingPreview).toHaveBeenCalledTimes(2));
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
      mocks.offboardingTrades.mockResolvedValue({
        items: [ordinaryTrade, frozenTrade, assistedTrade],
        truncated: false,
      });
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
      fireEvent.change(screen.getByLabelText('Case reference'), { target: { value: 'CASE-55' } });
      expect(submit().disabled).toBe(true);
      fireEvent.click(screen.getByLabelText(/I verified the company's request/));
      expect(submit().disabled).toBe(false);
      expect(mocks.reassignResponsible).not.toHaveBeenCalled();

      fireEvent.click(submit());
      await waitFor(() => expect(mocks.reassignResponsible).toHaveBeenCalledTimes(1));
      expect(mocks.reassignResponsible).toHaveBeenCalledWith('trade-ordinary', {
        side: 'BUYER',
        replacement_user_id: 'user-4',
        evidence_case_ref: 'CASE-55',
        expected_current_user_id: 'user-1',
      });
      // The list is read again after the change.
      await waitFor(() => expect(mocks.offboardingTrades).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('The responsible person was changed.')).toBeTruthy();
    });

    it('manual_resolution_refusal_is_shown_and_not_repeated', async () => {
      mocks.reassignResponsible.mockRejectedValueOnce(
        new ApiError('refused', 409, 'REASSIGN_MANUAL_RESOLUTION_REQUIRED'),
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
      mocks.reassignResponsible.mockRejectedValueOnce(new ApiError('stale', 409, 'RESPONSIBLE_USER_CHANGED'));
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
  });

  describe('localized errors', () => {
    it('maps_known_codes_in_english_and_chinese', async () => {
      await loadNamespace('admin');
      await act(async () => { await i18n.changeLanguage('zh'); });
      mocks.offboardingTrades.mockResolvedValue({ items: [ordinaryTrade], truncated: false });
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

    it('shows_a_clear_message_when_the_route_is_not_available', async () => {
      mocks.offboardingPreview.mockRejectedValueOnce(new ApiError('Not Found', 404, null));
      renderUsers();

      fireEvent.click(await screen.findByRole('button', { name: 'Offboard member mei@northstar.example' }));
      expect(await screen.findByText('Offboarding is not available right now.')).toBeTruthy();
      expect(confirmButton().disabled).toBe(true);
    });
  });
});

describe('offboarding api contract', () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it('sends_an_explicit_null_organization_and_the_exact_fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ operation_id: 'op-1', former_organization_id: null, state: 'OFFBOARDED' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.admin.offboardUser('user-2', {
      reason_code: 'OTHER',
      evidence_case_ref: 'CASE-3',
      urgent: false,
      expected_organization_id: null,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/admin\/users\/user-2\/offboard$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"reason_code":"OTHER","evidence_case_ref":"CASE-3","urgent":false,"expected_organization_id":null}');
    expect(result).toEqual({ operation_id: 'op-1', former_organization_id: null, state: 'OFFBOARDED' });
  });

  it('reads_the_preview_and_refuses_a_response_without_the_organization_field', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(memberPreview))
      .mockResolvedValueOnce(json({ ...memberPreview, organization_id: undefined }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.admin.offboardingPreview('user-1')).resolves.toEqual(memberPreview);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/admin\/users\/user-1\/offboarding-preview$/);
    // A missing key is not the same as "no company": the response is refused.
    await expect(api.admin.offboardingPreview('user-1')).rejects.toBeInstanceOf(ApiError);
  });

  it('refuses_counts_that_are_not_whole_numbers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...memberPreview, open_order_count: -1 })));
    await expect(api.admin.offboardingPreview('user-1')).rejects.toBeInstanceOf(ApiError);
  });

  it('treats_a_server_failure_of_the_command_as_an_unknown_outcome', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: { code: 'X', message: 'down' } }, 503)));
    await expect(api.admin.offboardUser('user-1', {
      reason_code: 'OTHER',
      evidence_case_ref: 'CASE-4',
      urgent: false,
      expected_organization_id: 'org-1',
    })).rejects.toBeInstanceOf(ApiOutcomeUnknownError);
  });

  it('treats_a_missing_freeze_indicator_as_frozen', async () => {
    const { frozen: _omitted, ...withoutFreeze } = ordinaryTrade;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ items: [withoutFreeze], truncated: true })));

    const list = await api.admin.offboardingTrades('user-1');
    expect(list.items[0].frozen).toBe(true);
    expect(list.truncated).toBe(true);
  });

  it('posts_the_reassignment_body_with_the_expected_current_user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal('fetch', fetchMock);

    await api.admin.reassignResponsible('trade-1', {
      side: 'SELLER',
      replacement_user_id: 'user-7',
      evidence_case_ref: 'CASE-5',
      expected_current_user_id: 'user-1',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/admin\/trades\/trade-1\/reassign-responsible$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      side: 'SELLER',
      replacement_user_id: 'user-7',
      evidence_case_ref: 'CASE-5',
      expected_current_user_id: 'user-1',
    });
  });
});
