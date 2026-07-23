import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  BarChart3,
  Loader2,
  ShieldCheck,
  CheckCircle2,
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

const UsersTab: React.FC = () => {
  const [filter, setFilter] = useState<UserStatusFilter>('PENDING');
  const [users, setUsers]   = useState<AdminUserEntry[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [actioning, setActioning] = useState<string | null>(null); // user id being acted on
  const [entryOrganization, setEntryOrganization] = useState<SupportOrganization | null>(null);
  const [entry, setEntry] = useState<MarketSupportEntry | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [replacementInput, setReplacementInput] = useState<MarketSupportStartInput | null>(null);
  const navigate = useNavigate();
  const { start, resume } = useMarketSupport();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'ALL') params.set('status', filter);
      const data = await api.admin.users(params.toString());
      setUsers(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (userId: string) => {
    setActioning(userId);
    try {
      await api.admin.approveUser(userId);
      await load();
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActioning(userId);
    try {
      await api.admin.rejectUser(userId);
      await load();
    } finally {
      setActioning(null);
    }
  };

  const handleEnterSupplierPlatform = async (user: AdminUserEntry) => {
    setEntryError(null);
    setEntry(null);
    setEntryLoading(true);
    try {
      const organizationId = user.organization_id ?? '';
      if (!organizationId || !user.org_name) throw new Error('This supplier organization could not be resolved.');
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
        setEntryError('An active Market Support context already exists. Confirm replacement explicitly to continue.');
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
      setEntryError(error instanceof Error ? error.message : 'Could not replace the active Market Support context.');
    }
  };

  const resumeContext = async () => {
    setEntryError(null);
    try {
      const active = await resume();
      if (!active) throw new Error('No active Market Support context is available to resume.');
      navigate('/app/home');
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : 'Could not resume the Market Support context.');
    }
  };

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
                const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
                const canEnterSupplierPlatform = (
                  u.status === 'APPROVED'
                  && u.role === 'SUPPLIER'
                  && u.org_provenance === 'REAL'
                  && Boolean(u.organization_id && u.org_name)
                );
                return (
                  <tr key={u.id} className="border-b border-verdaxis-border/50 last:border-0 hover:bg-verdaxis-border/10 transition-colors">
                    <td className="px-4 py-3 text-verdaxis-text font-medium">{name}</td>
                    <td className="px-4 py-3 text-verdaxis-text-muted font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-verdaxis-text-muted">
                      {canEnterSupplierPlatform ? (
                        <button
                          type="button"
                          onClick={() => handleEnterSupplierPlatform(u)}
                          disabled={entryLoading}
                          className="text-left font-semibold text-verdaxis underline decoration-verdaxis/40 underline-offset-4 transition-colors hover:decoration-verdaxis disabled:opacity-50"
                          aria-label={`Enter ${u.org_name} supplier platform`}
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
                          {u.org_name ?? '—'}
                          {u.org_type && (
                            <span className="ml-1 text-xs opacity-60 capitalize">
                              ({u.org_type.replace(/_/g, ' ').toLowerCase()})
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
                            onClick={() => handleApprove(u.id)}
                            disabled={isActioning}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActioning ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Approve
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
                            onClick={() => handleApprove(u.id)}
                            disabled={isActioning}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isActioning ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Re-approve
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
        isOpen={Boolean(replacementInput)}
        onClose={() => setReplacementInput(null)}
        onConfirm={() => { void replaceContext(); }}
        title="Replace active Market Support context?"
        message="The existing support context will be ended and replaced for this admin session. This does not alter existing supplier listings."
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
