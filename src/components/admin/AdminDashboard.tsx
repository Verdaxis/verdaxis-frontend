import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  BarChart3,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  LifeBuoy,
} from 'lucide-react';
import { api } from '../../services/api';
import { marketSupportApi, type AdminCapability } from '../../services/marketSupportApi';
import { useNamespace } from '../../hooks/useNamespace';
import { ProductAnalyticsWorkspace } from './product-analytics/ProductAnalyticsWorkspace';
import { MarketSupportWorkspace } from './MarketSupportWorkspace';

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
                return (
                  <tr key={u.id} className="border-b border-verdaxis-border/50 last:border-0 hover:bg-verdaxis-border/10 transition-colors">
                    <td className="px-4 py-3 text-verdaxis-text font-medium">{name}</td>
                    <td className="px-4 py-3 text-verdaxis-text-muted font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-verdaxis-text-muted">
                      {u.org_name ?? '—'}
                      {u.org_type && (
                        <span className="ml-1 text-xs opacity-60 capitalize">
                          ({u.org_type.replace(/_/g, ' ').toLowerCase()})
                        </span>
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
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type AdminTab = 'analytics' | 'users' | 'market-support';

// Tab state lives in the URL so admin workspaces are bookmarkable and survive
// refresh. Market Support remains hidden until the backend returns a live,
// revocable capability grant for the authenticated administrator.
const ADMIN_TAB_PATHS: Record<AdminTab, string> = {
  analytics: '/app/admin',
  users: '/app/admin/users',
  'market-support': '/app/admin/market-support',
};

export const AdminDashboard: React.FC = () => {
  const { t, ready } = useNamespace('admin');
  const location = useLocation();
  const [marketSupportCapabilities, setMarketSupportCapabilities] = useState<AdminCapability[]>([]);

  useEffect(() => {
    let cancelled = false;
    marketSupportApi.capabilities()
      .then((capabilities) => {
        if (!cancelled) setMarketSupportCapabilities(capabilities);
      })
      .catch(() => {
        if (!cancelled) setMarketSupportCapabilities([]);
      });
    return () => { cancelled = true; };
  }, []);

  const activeTab: AdminTab = location.pathname.startsWith('/app/admin/market-support')
    ? 'market-support'
    : location.pathname.startsWith('/app/admin/users')
      ? 'users'
      : 'analytics';
  const canUseMarketSupport = marketSupportCapabilities.length > 0;
  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={15} /> },
    { key: 'users', label: 'Users', icon: <Users size={15} /> },
    ...(canUseMarketSupport
      ? [{ key: 'market-support' as const, label: 'Market Support', icon: <LifeBuoy size={15} /> }]
      : []),
  ];

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
        {tabs.map(({ key, label, icon }) => (
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

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'analytics' && <ProductAnalyticsWorkspace />}
      {activeTab === 'market-support' && <MarketSupportWorkspace />}
    </div>
  );
};
