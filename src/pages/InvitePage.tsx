import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';

interface ResolveResponse {
  valid: boolean;
  organization_name?: string;
  organization_type?: string;
  referrer_name?: string;
}

export const InvitePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ResolveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, ready } = useNamespace('auth');

  useEffect(() => {
    if (!code) {
      setData({ valid: false });
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/referrals/resolve/${code}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ valid: false }))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = () => {
    navigate(code ? `/register?ref=${code}` : '/register');
  };

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 text-lg">{ready ? t('invite.loading') : ''}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('invite.title')}</h1>
          <div className="h-1 w-16 bg-emerald-500 mx-auto rounded" />
        </div>

        {data?.valid ? (
          <>
            <p className="text-slate-300 text-lg mb-2">{t('invite.invitedBy')}</p>
            <p className="text-white text-2xl font-semibold mb-1">
              {data.organization_name || data.referrer_name || t('invite.fallbackOrg')}
            </p>
            {data.organization_type && (
              <p className="text-emerald-400 text-sm mb-8 capitalize">
                {data.organization_type.replace(/_/g, ' ').toLowerCase()}
              </p>
            )}
            <p className="text-slate-400 mb-8">
              {t('invite.descriptionWithInvite')}
            </p>
          </>
        ) : (
          <>
            <p className="text-slate-300 text-lg mb-4">
              {t('invite.joinMarketplace')}
            </p>
            <p className="text-slate-400 mb-8">
              {t('invite.descriptionGeneral')}
            </p>
          </>
        )}

        <button
          onClick={handleJoin}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          {t('invite.createAccount')}
        </button>

        <p className="text-slate-500 text-sm mt-6">
          {t('invite.hasAccount')}{' '}
          <a href="/login" className="text-emerald-400 hover:text-emerald-300">
            {t('invite.logIn')}
          </a>
        </p>
      </div>
    </div>
  );
};
