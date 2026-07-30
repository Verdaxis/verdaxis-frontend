import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  BarChart3,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { ApiError, api } from '../../services/api';
import { useNamespace } from '../../hooks/useNamespace';
import { ProductAnalyticsWorkspace } from './product-analytics/ProductAnalyticsWorkspace';
import { MarketSupportEntryDialog } from './market-support/MarketSupportEntryDialog';
import { useMarketSupport } from '../../context/MarketSupportContext';
import type { MarketSupportEntry, MarketSupportStartInput, SupportOrganization } from '../../types/marketSupport';
import { ConfirmModal } from '../ui/ConfirmModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminUserEntry {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  created_at: string;
  org_name: string | null;
  org_type: string | null;
  org_provenance: string | null;
  organization_id?: string | null;
}

interface AdminReviewOrganization {
  id: string;
  name: string;
  type?: string | null;
  verification_status: string;
}

interface AdminReviewRequest {
  request_id: string;
  status: string;
  organization: AdminReviewOrganization | null;
}

interface AdminReviewCase {
  user_id: string;
  email: string;
  email_verified: boolean;
  account_status: string;
  role: string;
  created_at: string;
  current_organization: AdminReviewOrganization | null;
  requested_organizations: AdminReviewRequest[];
}

type ReviewAction =
  | { kind: 'resend' }
  | { kind: 'account' }
  | { kind: 'organization'; organizationId: string }
  | { kind: 'membership'; requestId: string }
  | null;

type UserStatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const statusBadge = (status: string) => {
  const cfg: Record<string, { cls: string; label: string }> = {
    PENDING:  { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   label: 'Pending'  },
    APPROVED: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Approved' },
    REJECTED: { cls: 'bg-red-500/15 text-red-400 border-red-500/30',         label: 'Rejected' },
  };
  const { cls, label } = cfg[status] ?? { cls: 'bg-slate-500/15 text-slate-400', label: status };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{label}</span>
  );
};

const STATUS_FILTERS: { label: string; value: UserStatusFilter }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'All',     value: 'ALL'     },
  { label: 'Approved',value: 'APPROVED'},
  { label: 'Rejected',value: 'REJECTED'},
];

const nextReviewAction = (review: AdminReviewCase): ReviewAction => {
  if (!review.email_verified) return { kind: 'resend' };
  if (review.account_status !== 'APPROVED') return { kind: 'account' };

  const pendingJoin = review.requested_organizations.find(request => request.status === 'PENDING');
  const organization = pendingJoin?.organization ?? review.current_organization;
  if (organization && organization.verification_status !== 'APPROVED') {
    return { kind: 'organization', organizationId: organization.id };
  }
  if (pendingJoin) return { kind: 'membership', requestId: pendingJoin.request_id };
  return null;
};

const UsersTab: React.FC = () => {
  const [filter, setFilter] = useState<UserStatusFilter>('PENDING');
  const [users, setUsers]   = useState<AdminUserEntry[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [actioning, setActioning] = useState<string | null>(null); // user id being acted on
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewByUser, setReviewByUser] = useState<Record<string, AdminReviewCase>>({});
  const [reviewCase, setReviewCase] = useState<AdminReviewCase | null>(null);
  const [reviewActioning, setReviewActioning] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [entryOrganization, setEntryOrganization] = useState<SupportOrganization | null>(null);
  const [entry, setEntry] = useState<MarketSupportEntry | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [replacementInput, setReplacementInput] = useState<MarketSupportStartInput | null>(null);
  const navigate = useNavigate();
  const { start, resume } = useMarketSupport();

  const load = useCallback(async () => {
    setLoading(true);
    setUserError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'ALL') params.set('status', filter);
      const [data, queue] = await Promise.all([
        api.admin.users(params.toString()),
        filter === 'PENDING'
          ? api.admin.reviewQueue(100)
          : Promise.resolve({ items: [] }),
      ]);
      setUsers(data.items ?? []);
      setTotal(data.total ?? 0);
      setReviewByUser(Object.fromEntries(
        (queue.items ?? []).map((review: AdminReviewCase) => [review.user_id, review]),
      ));
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (userId: string) => {
    setReviewing(userId);
    setReviewError(null);
    setReviewNotice(null);
    setVerificationSent(false);
    try {
      setReviewCase(await api.admin.reviewCase(userId));
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Could not load this onboarding review.');
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActioning(userId);
    setUserError(null);
    try {
      await api.admin.rejectUser(userId);
      await load();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Could not reject this account.');
    } finally {
      setActioning(null);
    }
  };

  const closeReview = () => {
    setReviewCase(null);
    setReviewError(null);
    setReviewNotice(null);
    setVerificationSent(false);
  };

  const handleReviewAction = async () => {
    if (!reviewCase) return;
    const action = nextReviewAction(reviewCase);
    if (!action || (action.kind === 'resend' && verificationSent)) return;

    setReviewActioning(true);
    setReviewError(null);
    setReviewNotice(null);
    try {
      if (action.kind === 'resend') {
        await api.admin.resendVerification(reviewCase.email);
        setVerificationSent(true);
        setReviewNotice('Verification email sent. Approval remains locked until the user opens it.');
        return;
      }
      if (action.kind === 'account') {
        await api.admin.approveUser(reviewCase.user_id);
      } else if (action.kind === 'organization') {
        await api.admin.approveOrganization(action.organizationId);
      } else {
        await api.admin.approveOrganizationJoin(action.requestId);
      }
      setReviewCase(await api.admin.reviewCase(reviewCase.user_id));
      await load();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Could not complete this review step.');
    } finally {
      setReviewActioning(false);
    }
  };

  const handleEnterOrganization = async (user: AdminUserEntry) => {
    setEntryError(null);
    setEntry(null);
    setEntryLoading(true);
    try {
      const organizationId = user.organization_id ?? '';
      if (!organizationId || !user.org_name) throw new Error('This organization could not be resolved.');
      const organization: SupportOrganization = {
        id: organizationId,
        name: user.org_name,
        domain: null,
        type: String(user.org_type ?? 'REAL').toUpperCase(),
      };
      setEntryOrganization(organization);
      setEntry(await api.marketSupport.entry(organizationId));
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : 'Could not check organization eligibility.');
    } finally {
      setEntryLoading(false);
    }
  };

  const closeEntry = () => {
    setEntryOrganization(null);
    setEntry(null);
    setEntryError(null);
    setReplacementInput(null);
  };

  const startContext = async (input: MarketSupportStartInput) => {
    try {
      await start(input);
      closeEntry();
      navigate('/app/home');
    } catch (error) {
      if (
        error instanceof ApiError
        && /ACTIVE_CONTEXT|CONTEXT_ALREADY_ACTIVE|CONTEXT_REPLACEMENT_REQUIRED/.test(
          error.code ?? ''
        )
      ) {
        setReplacementInput(input);
        setEntryError('An assisted workspace is already active. Confirm replacement to continue.');
        return;
      }
      throw error;
    }
  };

  const replaceContext = async () => {
    if (!replacementInput) return;
    setEntryError(null);
    try {
      await start({ ...replacementInput, replaceActive: true });
      closeEntry();
      navigate('/app/home');
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : 'Could not replace the active assisted workspace.');
    }
  };

  const resumeContext = async () => {
    setEntryError(null);
    try {
      const active = await resume();
      if (!active) throw new Error('No assisted workspace is available to resume.');
      navigate('/app/home');
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : 'Could not resume the assisted workspace.');
    }
  };

  const reviewAction = reviewCase ? nextReviewAction(reviewCase) : null;
  const pendingJoin = reviewCase?.requested_organizations.find(request => request.status === 'PENDING');
  const reviewOrganization = pendingJoin?.organization ?? reviewCase?.current_organization ?? null;
  const reviewConfirmText = reviewAction?.kind === 'resend'
    ? (verificationSent ? 'Verification email sent' : 'Send verification email')
    : reviewAction?.kind === 'account'
      ? 'Approve account'
      : reviewAction?.kind === 'organization'
        ? 'Approve organization'
        : reviewAction?.kind === 'membership'
          ? 'Approve membership'
          : 'Onboarding complete';

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === value
                ? 'bg-verdaxis text-white'
                : 'bg-verdaxis-border/40 text-verdaxis-text-muted hover:text-verdaxis-text'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-verdaxis-text-muted self-center">
          {total} {total === 1 ? 'user' : 'users'}
        </span>
        <button type="button" onClick={() => { void resumeContext(); }} className="rounded-full border border-verdaxis px-3 py-1.5 text-xs font-semibold text-verdaxis hover:bg-verdaxis/10">
          Resume active context
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-verdaxis" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-verdaxis-text-muted text-sm py-6 text-center">
          No {filter !== 'ALL' ? filter.toLowerCase() : ''} users found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-verdaxis-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-verdaxis-border text-verdaxis-text-muted text-xs uppercase">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isActioning = actioning === u.id;
                const isReviewing = reviewing === u.id;
                const queuedReview = reviewByUser[u.id];
                const queuedJoin = queuedReview?.requested_organizations.find(request => request.status === 'PENDING');
                const queuedOrganization = queuedReview?.current_organization ?? queuedJoin?.organization;
                const displayOrganizationName = u.org_name ?? queuedOrganization?.name ?? null;
                const displayOrganizationType = u.org_type ?? queuedOrganization?.type ?? null;
                const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
                const canEnterOrganization = (
                  u.status === 'APPROVED'
                  && u.org_provenance === 'REAL'
                  && Boolean(u.organization_id && u.org_name)
                );
                return (
                  <tr key={u.id} className="border-b border-verdaxis-border/50 last:border-0 hover:bg-verdaxis-border/10 transition-colors">
                    <td className="px-4 py-3 text-verdaxis-text font-medium">{name}</td>
                    <td className="px-4 py-3 text-verdaxis-text-muted font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-verdaxis-text-muted">
                      {canEnterOrganization ? (
                        <button
                          type="button"
                          onClick={() => handleEnterOrganization(u)}
                          disabled={entryLoading}
                          className="text-left font-semibold text-verdaxis underline decoration-verdaxis/40 underline-offset-4 transition-colors hover:decoration-verdaxis disabled:opacity-50"
                          aria-label={`Enter ${u.org_name} organization workspace`}
                        >
                          {u.org_name}
                          {u.org_type && (
                            <span className="ml-1 text-xs font-normal opacity-60 capitalize">
                              ({u.org_type.replace(/_/g, ' ').toLowerCase()})
                            </span>
                          )}
                        </button>
                      ) : (
                        <>
                          {displayOrganizationName ?? '—'}
                          {displayOrganizationType && (
                            <span className="ml-1 text-xs opacity-60 capitalize">
                              ({displayOrganizationType.replace(/_/g, ' ').toLowerCase()})
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-verdaxis-text-muted capitalize">{u.role.toLowerCase()}</td>
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3 text-verdaxis-text-muted text-xs whitespace-nowrap">
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {u.status === 'PENDING' && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleReview(u.id)}
                            disabled={isActioning || isReviewing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isReviewing ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <ShieldCheck size={12} />
                            )}
                            Review
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            disabled={isActioning}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActioning ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <XCircle size={12} />
                            )}
                            Reject
                          </button>
                        </div>
                      )}
                      {u.status === 'REJECTED' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleReview(u.id)}
                            disabled={isActioning || isReviewing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isReviewing ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                            Review
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {userError && <p role="alert" className="text-sm text-red-400">{userError}</p>}
      {entryError && <p role="alert" className="text-sm text-red-400">{entryError}</p>}
      {entryOrganization && (
        <MarketSupportEntryDialog
          open
          organization={entryOrganization}
          entry={entry}
          loading={entryLoading}
          onStart={startContext}
          error={entryError}
          onClose={closeEntry}
        />
      )}
      <ConfirmModal
        isOpen={Boolean(reviewCase)}
        onClose={closeReview}
        onConfirm={() => { void handleReviewAction(); }}
        title={`Review ${reviewCase?.email ?? 'account'}`}
        message="Complete each independent onboarding check in order."
        confirmText={reviewConfirmText}
        cancelText="Close"
        variant={reviewAction ? 'info' : 'success'}
        isLoading={reviewActioning}
        confirmDisabled={!reviewAction || (reviewAction.kind === 'resend' && verificationSent)}
        maxWidth="lg"
        compact
      >
        {reviewCase && (
          <div className="mt-5 divide-y divide-verdaxis-border rounded-lg border border-verdaxis-border">
            {[
              ['Email', reviewCase.email_verified ? 'Verified' : 'Awaiting verification', reviewCase.email_verified],
              ['Account', reviewCase.account_status.toLowerCase(), reviewCase.account_status === 'APPROVED'],
              ['Organization', reviewOrganization ? `${reviewOrganization.name} · ${reviewOrganization.verification_status.toLowerCase()}` : 'Not requested', reviewOrganization?.verification_status === 'APPROVED'],
              ['Membership', reviewCase.current_organization ? 'Approved' : pendingJoin ? pendingJoin.status.toLowerCase() : 'Not requested', Boolean(reviewCase.current_organization)],
            ].map(([label, value, complete]) => (
              <div key={String(label)} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                <span className="text-verdaxis-text-muted">{String(label)}</span>
                <span className={`font-semibold capitalize ${complete ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
        {reviewNotice && (
          <p role="status" className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {reviewNotice}
          </p>
        )}
        {reviewError && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {reviewError}
          </p>
        )}
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(replacementInput)}
        onClose={() => setReplacementInput(null)}
        onConfirm={() => { void replaceContext(); }}
        title="Replace active assisted workspace?"
        message="The existing assisted-order context will be ended and replaced for this admin session. This does not alter existing orders."
        confirmText="Replace context"
        variant="warning"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type AdminTab = 'analytics' | 'users';

// Tab state lives in the URL so /app/admin and /app/admin/users are
// bookmarkable and survive refresh (Sprint 3 item 11).
const ADMIN_TAB_PATHS: Record<AdminTab, string> = {
  analytics: '/app/admin',
  users: '/app/admin/users',
};

export const AdminDashboard: React.FC = () => {
  const { t, ready } = useNamespace('admin');
  const location = useLocation();
  const activeTab: AdminTab = location.pathname.startsWith('/app/admin/users')
      ? 'users'
      : 'analytics';
  if (location.pathname.startsWith('/app/admin/market-support')) {
    return <Navigate to={ADMIN_TAB_PATHS.analytics} replace />;
  }
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-verdaxis" />
        <span className="ml-3 text-verdaxis-text-muted font-medium">{ready ? t('loading') : '...'}</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-verdaxis" />
        <h1 className="v-heading text-2xl">{t('page.title')}</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-verdaxis-border">
        {([
          { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },
          { key: 'users',     label: 'Users',     icon: <Users size={15} />    },
        ] as { key: AdminTab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
          <Link
            key={key}
            to={ADMIN_TAB_PATHS[key]}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? 'border-verdaxis text-verdaxis'
                : 'border-transparent text-verdaxis-text-muted hover:text-verdaxis-text'
            }`}
          >
            {icon}{label}
          </Link>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === 'users' && <UsersTab />}

      {/* Analytics tab */}
      {activeTab === 'analytics' && <ProductAnalyticsWorkspace />}

    </div>
  );
};
