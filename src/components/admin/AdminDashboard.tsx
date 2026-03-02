import React, { useEffect, useState } from 'react';
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
  total_commissions: number;
  total_amount_usd: number;
  pending_count: number;
  total_pending_usd: number;
  invoiced_count: number;
  total_invoiced_usd: number;
  paid_count: number;
  total_paid_usd: number;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtUsd = (n: number) => `$${fmt(n, 2)}`;

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
// Main Component
// ---------------------------------------------------------------------------

export const AdminDashboard: React.FC = () => {
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

        // If the main overview call failed, surface the error
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

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-verdaxis" />
        <span className="ml-3 text-verdaxis-text-muted font-medium">Loading admin dashboard...</span>
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
          Retry
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Chart data
  // -------------------------------------------------------------------------

  const chartData = daily.map((d) => ({
    ...d,
    label: fmtDate(d.date),
  }));

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-verdaxis" />
        <h1 className="v-heading text-2xl">Platform Admin</h1>
      </div>

      {/* Summary cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <SummaryCard
            title="Total Users"
            value={fmt(overview.total_users)}
            subtitle={`${fmt(overview.active_users_7d)} active (7d)`}
            icon={<Users size={18} className="text-white" />}
            color="bg-blue-500"
          />
          <SummaryCard
            title="Active Traders"
            value={fmt(overview.active_users_7d)}
            subtitle={`${fmt(overview.total_organizations)} organizations`}
            icon={<Activity size={18} className="text-white" />}
            color="bg-emerald-500"
          />
          <SummaryCard
            title="Total Volume"
            value={`${fmt(overview.total_volume_mt)} MT`}
            subtitle={`${fmt(overview.total_trades)} trades (${fmt(overview.confirmed_trades)} confirmed)`}
            icon={<Package size={18} className="text-white" />}
            color="bg-teal-500"
          />
          <SummaryCard
            title="Platform Revenue"
            value={fmtUsd(overview.total_revenue_usd)}
            subtitle="From paid commissions"
            icon={<DollarSign size={18} className="text-white" />}
            color="bg-amber-500"
          />
          <SummaryCard
            title="GMV"
            value={fmtUsd(overview.total_gmv_usd)}
            subtitle={`${fmt(overview.total_orders)} orders (${fmt(overview.open_orders)} open)`}
            icon={<TrendingUp size={18} className="text-white" />}
            color="bg-violet-500"
          />
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Volume Bar Chart */}
          <div className="v-card p-5">
            <h2 className="v-heading text-lg mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-500" />
              Daily Trading Volume (MT)
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
                  <Bar dataKey="volume_mt" name="Volume (MT)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily GMV Line Chart */}
          <div className="v-card p-5">
            <h2 className="v-heading text-lg mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              Daily GMV (USD)
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
                    formatter={(value: number) => [fmtUsd(value), 'GMV']}
                  />
                  <Line
                    type="monotone"
                    dataKey="gmv_usd"
                    name="GMV (USD)"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="commission_usd"
                    name="Commission (USD)"
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
        {/* Audit Logs */}
        <div className="lg:col-span-2 v-card p-5">
          <h2 className="v-heading text-lg mb-4">Recent Activity</h2>
          {auditLogs.length === 0 ? (
            <p className="text-verdaxis-text-muted text-sm">No audit log entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-verdaxis-text-muted text-xs uppercase border-b border-verdaxis-border">
                    <th className="text-left py-2 pr-4">Time</th>
                    <th className="text-left py-2 pr-4">Action</th>
                    <th className="text-left py-2 pr-4">Resource</th>
                    <th className="text-left py-2">IP</th>
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

        {/* Commission Summary */}
        <div className="v-card p-5">
          <h2 className="v-heading text-lg mb-4 flex items-center gap-2">
            <Banknote size={18} className="text-amber-500" />
            Commission Summary
          </h2>
          {commission ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-verdaxis-text-muted text-sm">Total Earned</span>
                <span className="font-['Montserrat'] font-bold text-verdaxis-text">
                  {fmtUsd(commission.total_amount_usd)}
                </span>
              </div>
              <hr className="border-verdaxis-border" />
              <div className="flex justify-between items-center">
                <span className="text-verdaxis-text-muted text-sm">Pending</span>
                <span className="text-amber-500 font-semibold">
                  {fmtUsd(commission.total_pending_usd)} ({commission.pending_count})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-verdaxis-text-muted text-sm">Invoiced</span>
                <span className="text-blue-500 font-semibold">
                  {fmtUsd(commission.total_invoiced_usd)} ({commission.invoiced_count})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-verdaxis-text-muted text-sm">Paid</span>
                <span className="text-emerald-500 font-semibold">
                  {fmtUsd(commission.total_paid_usd)} ({commission.paid_count})
                </span>
              </div>
            </div>
          ) : (
            <p className="text-verdaxis-text-muted text-sm">No commission data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
