import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Package,
  Banknote,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../../services/api';
import { useNamespace } from '../../hooks/useNamespace';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewData {
  total_users: number;
  active_users_7d: number;
  total_organizations: number;
  total_orders: number;
  open_orders: number;
  total_trades: number;
  confirmed_trades: number;
  total_volume_mt: number;
  total_revenue_usd: number;
  total_gmv_usd: number;
}

interface DailyStat {
  date: string;
  orders_placed: number;
  trades_executed: number;
  volume_mt: number;
  gmv_usd: number;
  commission_usd: number;
}

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  request_id: string | null;
  timestamp: string;
}

interface CommissionSummary {
  pending_count: number;
  total_pending_usd: number | string;
  invoiced_count: number;
  total_invoiced_usd: number | string;
  paid_count: number;
  total_paid_usd: number | string;
}

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

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (n: number | string | null | undefined, decimals = 0) =>
  toNumber(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtUsd = (n: number | string | null | undefined) => `$${fmt(n, 2)}`;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtTimestamp = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, icon, color }) => (
  <div className="v-card p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-verdaxis-text-muted uppercase tracking-wider">{title}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    </div>
    <div className="font-['Montserrat'] font-bold text-2xl text-verdaxis-text">{value}</div>
    {subtitle && <span className="text-xs text-verdaxis-text-muted">{subtitle}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

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

type AdminTab = 'analytics' | 'users';

export const AdminDashboard: React.FC = () => {
  const { t, ready } = useNamespace('admin');
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [commission, setCommission] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ov, dl, logs, comm] = await Promise.allSettled([
          api.admin.overview(),
          api.admin.daily(30),
          api.admin.auditLogs({ limit: 10 }),
          api.admin.commissionSummary(),
        ]);

        if (ov.status === 'fulfilled') setOverview(ov.value);
        if (dl.status === 'fulfilled') setDaily(dl.value);
        if (logs.status === 'fulfilled') setAuditLogs(logs.value);
        if (comm.status === 'fulfilled') setCommission(comm.value);

        if (ov.status === 'rejected') {
          setError(ov.reason?.message || 'Failed to load overview data');
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-verdaxis" />
        <span className="ml-3 text-verdaxis-text-muted font-medium">{ready ? t('loading') : '...'}</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-verdaxis-text font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="v-btn-primary text-sm px-4 py-2"
        >
          {t('error.retry')}
        </button>
      </div>
    );
  }

  const chartData = daily.map((d) => ({
    ...d,
    label: fmtDate(d.date),
  }));

  const totalCommissionUsd = commission
    ? toNumber(commission.total_pending_usd)
      + toNumber(commission.total_invoiced_usd)
      + toNumber(commission.total_paid_usd)
    : 0;

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
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? 'border-verdaxis text-verdaxis'
                : 'border-transparent text-verdaxis-text-muted hover:text-verdaxis-text'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === 'users' && <UsersTab />}

      {/* Analytics tab */}
      {activeTab === 'analytics' && (
        <>
          {/* Summary cards */}
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <SummaryCard
                title={t('cards.totalUsers')}
                value={fmt(overview.total_users)}
                subtitle={t('cards.totalUsersSubtitle', { count: overview.active_users_7d })}
                icon={<Users size={18} className="text-white" />}
                color="bg-blue-500"
              />
              <SummaryCard
                title={t('cards.activeTraders')}
                value={fmt(overview.active_users_7d)}
                subtitle={t('cards.activeTradersSubtitle', { count: overview.total_organizations })}
                icon={<Activity size={18} className="text-white" />}
                color="bg-emerald-500"
              />
              <SummaryCard
                title={t('cards.totalVolume')}
                value={`${fmt(overview.total_volume_mt)} MT`}
                subtitle={t('cards.totalVolumeSubtitle', { trades: fmt(overview.total_trades), confirmed: fmt(overview.confirmed_trades) })}
                icon={<Package size={18} className="text-white" />}
                color="bg-teal-500"
              />
              <SummaryCard
                title={t('cards.platformRevenue')}
                value={fmtUsd(overview.total_revenue_usd)}
                subtitle={t('cards.platformRevenueSubtitle')}
                icon={<DollarSign size={18} className="text-white" />}
                color="bg-amber-500"
              />
              <SummaryCard
                title={t('cards.gmv')}
                value={fmtUsd(overview.total_gmv_usd)}
                subtitle={t('cards.gmvSubtitle', { orders: fmt(overview.total_orders), open: fmt(overview.open_orders) })}
                icon={<TrendingUp size={18} className="text-white" />}
                color="bg-violet-500"
              />
            </div>
          )}

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="v-card p-5">
                <h2 className="v-heading text-lg mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-500" />
                  {t('charts.dailyVolume')}
                </h2>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="label" fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                      <YAxis fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <Bar dataKey="volume_mt" name={t('charts.volumeLegend')} fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="v-card p-5">
                <h2 className="v-heading text-lg mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500" />
                  {t('charts.dailyGmv')}
                </h2>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="label" fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                      <YAxis fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                        }}
                        formatter={(value: number) => [fmtUsd(value), t('charts.gmvLegend')]}
                      />
                      <Line
                        type="monotone"
                        dataKey="gmv_usd"
                        name={t('charts.gmvLegend')}
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="commission_usd"
                        name={t('charts.commissionLegend')}
                        stroke="#F59E0B"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 5"
                        activeDot={{ r: 4 }}
                      />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Bottom row: Audit logs + Commission summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 v-card p-5">
              <h2 className="v-heading text-lg mb-4">{t('audit.title')}</h2>
              {auditLogs.length === 0 ? (
                <p className="text-verdaxis-text-muted text-sm">{t('audit.empty')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-verdaxis-text-muted text-xs uppercase border-b border-verdaxis-border">
                        <th className="text-left py-2 pr-4">{t('audit.col.time')}</th>
                        <th className="text-left py-2 pr-4">{t('audit.col.action')}</th>
                        <th className="text-left py-2 pr-4">{t('audit.col.resource')}</th>
                        <th className="text-left py-2">{t('audit.col.ip')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b border-verdaxis-border/50 last:border-0">
                          <td className="py-2.5 pr-4 text-verdaxis-text-muted whitespace-nowrap">
                            {fmtTimestamp(log.timestamp)}
                          </td>
                          <td className="py-2.5 pr-4 text-verdaxis-text font-medium">{log.action}</td>
                          <td className="py-2.5 pr-4 text-verdaxis-text-muted">
                            {log.resource_type}
                            {log.resource_id && (
                              <span className="ml-1 text-xs opacity-60">#{log.resource_id.slice(0, 8)}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-verdaxis-text-muted font-mono text-xs">
                            {log.ip_address || '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="v-card p-5">
              <h2 className="v-heading text-lg mb-4 flex items-center gap-2">
                <Banknote size={18} className="text-amber-500" />
                {t('commission.title')}
              </h2>
              {commission ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-verdaxis-text-muted text-sm">{t('commission.totalEarned')}</span>
                    <span className="font-['Montserrat'] font-bold text-verdaxis-text">
                      {fmtUsd(totalCommissionUsd)}
                    </span>
                  </div>
                  <hr className="border-verdaxis-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-verdaxis-text-muted text-sm">{t('commission.pending')}</span>
                    <span className="text-amber-500 font-semibold">
                      {fmtUsd(commission.total_pending_usd)} ({commission.pending_count})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-verdaxis-text-muted text-sm">{t('commission.invoiced')}</span>
                    <span className="text-blue-500 font-semibold">
                      {fmtUsd(commission.total_invoiced_usd)} ({commission.invoiced_count})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-verdaxis-text-muted text-sm">{t('commission.paid')}</span>
                    <span className="text-emerald-500 font-semibold">
                      {fmtUsd(commission.total_paid_usd)} ({commission.paid_count})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-verdaxis-text-muted text-sm">{t('commission.empty')}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
