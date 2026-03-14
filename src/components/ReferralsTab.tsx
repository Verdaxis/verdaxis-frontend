import React, { useEffect, useState } from 'react';
import { Copy, Check, Send, Trophy, Users, UserCheck, Zap } from 'lucide-react';
import { API_URL } from '../services/config';
import { useAuth } from '../context/AuthContext';

interface ReferralItem {
  organization_name: string | null;
  role: string | null;
  status: string;
  signed_up_at: string;
}

interface ReferralStats {
  total: number;
  verified: number;
  active: number;
  referrals: ReferralItem[];
}

interface LeaderboardEntry {
  rank: number;
  user_name: string;
  organization_name: string | null;
  referral_count: number;
}

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    SIGNED_UP: 'bg-yellow-500/20 text-yellow-400',
    VERIFIED: 'bg-blue-500/20 text-blue-400',
    ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-slate-600 text-slate-300'}`}>
      {status}
    </span>
  );
};

export const ReferralsTab = () => {
  const { token, user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState<{ type: string; text: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API_URL}/referrals/my-code`, { headers })
      .then(r => r.json())
      .then(d => { setReferralCode(d.referral_code); setReferralLink(d.referral_link); })
      .catch(() => {});

    fetch(`${API_URL}/referrals/my-referrals`, { headers })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});

    fetch(`${API_URL}/referrals/leaderboard`, { headers })
      .then(r => r.json())
      .then(setLeaderboard)
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg(null);
    setInviteLoading(true);
    try {
      const res = await fetch(`${API_URL}/referrals/invite`, {
        method: 'POST', headers, body: JSON.stringify({ email: inviteEmail }),
      });
      if (res.ok) {
        setInviteMsg({ type: 'success', text: 'Invitation sent!' });
        setInviteEmail('');
      } else {
        const err = await res.json().catch(() => null);
        setInviteMsg({ type: 'error', text: err?.detail || 'Failed to send invite' });
      }
    } catch {
      setInviteMsg({ type: 'error', text: 'Network error' });
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Referral Link */}
      <div className="bg-slate-800 rounded-lg p-5">
        <h3 className="text-white font-semibold mb-3">Your Referral Link</h3>
        <div className="flex gap-2 mb-4">
          <input readOnly value={referralLink} className="flex-1 bg-slate-700 text-slate-200 rounded px-3 py-2 text-sm" />
          <button onClick={handleCopy} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded transition-colors">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email" required placeholder="colleague@company.com" value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 bg-slate-700 text-slate-200 rounded px-3 py-2 text-sm placeholder-slate-400"
          />
          <button type="submit" disabled={inviteLoading}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded transition-colors flex items-center gap-1 text-sm disabled:opacity-50">
            <Send size={14} /> Send
          </button>
        </form>
        {inviteMsg && (
          <p className={`mt-2 text-sm ${inviteMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <Users size={20} className="text-slate-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-slate-400">Total Referrals</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <UserCheck size={20} className="text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{stats.verified}</p>
            <p className="text-xs text-slate-400">Verified</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <Zap size={20} className="text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{stats.active}</p>
            <p className="text-xs text-slate-400">Active</p>
          </div>
        </div>
      )}

      {/* Referrals Table */}
      {stats && stats.referrals.length > 0 && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {stats.referrals.map((r, i) => (
                <tr key={i} className="border-b border-slate-700/50 text-slate-300">
                  <td className="px-4 py-3">{r.organization_name || '\u2014'}</td>
                  <td className="px-4 py-3 capitalize">{r.role?.toLowerCase() || '\u2014'}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(r.signed_up_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" /> Top Referrers
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-4 py-2 w-12">#</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Organization</th>
                <th className="text-right px-4 py-2">Referrals</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(entry => {
                const isMe = entry.user_name === `${(user as any)?.first_name || ''} ${(user as any)?.last_name || ''}`.trim();
                return (
                  <tr key={entry.rank} className={`border-b border-slate-700/50 ${isMe ? 'bg-emerald-500/10' : ''}`}>
                    <td className="px-4 py-2 text-slate-400 font-mono">{entry.rank}</td>
                    <td className="px-4 py-2 text-slate-200">{entry.user_name}{isMe && <span className="text-emerald-400 ml-1 text-xs">(you)</span>}</td>
                    <td className="px-4 py-2 text-slate-400">{entry.organization_name || '\u2014'}</td>
                    <td className="px-4 py-2 text-right text-white font-semibold">{entry.referral_count}</td>
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
