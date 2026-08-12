import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  BarChart3,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  XCircle,
  UserPlus,
  Copy,
  Check,
} from 'lucide-react';
import {
  AdminFeedbackEntry as FeedbackEntry,
  AdminInvitationInput,
  AdminInvitationOrganizationType,
  AdminInvitationOrganization,
  AdminInvitationResponse,
  ApiError,
  OnboardingAttentionItem,
  api,
} from '../../services/api';
import { useNamespace } from '../../hooks/useNamespace';
import { ProductAnalyticsWorkspace } from './product-analytics/ProductAnalyticsWorkspace';
import { MarketSupportEntryDialog } from './market-support/MarketSupportEntryDialog';
import { useMarketSupport } from '../../context/MarketSupportContext';
import type { MarketSupportEntry, MarketSupportStartInput, SupportOrganization } from '../../types/marketSupport';
import { defaultMarketSupportView } from '../../types/marketSupport';
import { ConfirmModal } from '../ui/ConfirmModal';
import { getAvailableCountries } from '../../utils/countries';

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
  email_verified?: boolean;
  last_login?: string | null;
  org_has_orders?: boolean;
  must_change_password?: boolean;
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

const fmtDate = (iso: string, locale?: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

const statusBadge = (status: string, t: TFunction) => {
  const cfg: Record<string, string> = {
    PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const cls = cfg[status] ?? 'bg-slate-500/15 text-slate-400';
  const label = t(`users.status.${status}`, { defaultValue: t('users.status.unknown') });
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{label}</span>
  );
};

// Furthest point an account has actually reached in the journey.
const journeyStage = (u: AdminUserEntry, t: TFunction): { label: string; cls: string } => {
  if (!u.email_verified && u.must_change_password) return { label: t('users.journey.invited'), cls: 'bg-sky-500/15 text-sky-400' };
  if (!u.email_verified) return { label: t('users.journey.registered'), cls: 'bg-slate-500/15 text-slate-400' };
  if (u.status !== 'APPROVED') return { label: t('users.journey.verified'), cls: 'bg-amber-500/15 text-amber-400' };
  if (!u.last_login) return { label: t('users.journey.approved'), cls: 'bg-amber-500/15 text-amber-400' };
  if (!u.org_has_orders) return { label: t('users.journey.loggedIn'), cls: 'bg-sky-500/15 text-sky-400' };
  return { label: t('users.journey.ordered'), cls: 'bg-emerald-500/15 text-emerald-400' };
};

const STATUS_FILTERS: UserStatusFilter[] = ['PENDING', 'ALL', 'APPROVED', 'REJECTED'];

const safeAdminError = (error: unknown, t: TFunction, language: string, fallbackKey: string) => {
  console.error(`[admin] ${fallbackKey}`, error);
  const fallback = t(fallbackKey);
  if (error instanceof ApiError && error.code) {
    const mapped = t(`errors.code.${error.code}`, { defaultValue: fallback });
    if (language.startsWith('zh') || mapped !== fallback) return mapped;
  }
  return language.startsWith('zh') ? fallback : error instanceof Error ? error.message : fallback;
};

type InvitationOrganizationMode = 'existing' | 'new';

interface InvitationForm {
  email: string;
  first_name: string;
  last_name: string | null;
  role: '' | 'BUYER' | 'SUPPLIER';
  organizationMode: InvitationOrganizationMode;
  organization_id: string;
  new_organization: {
    name: string;
    type: '' | AdminInvitationOrganizationType;
    country_code: string;
    tax_id: string;
  };
};

const EMPTY_INVITATION: InvitationForm = {
  email: '',
  first_name: '',
  last_name: null,
  role: '',
  organizationMode: 'existing',
  organization_id: '',
  new_organization: {
    name: '',
    type: '',
    country_code: '',
    tax_id: '',
  },
};

const BUYER_INVITATION_ORG_TYPES: AdminInvitationOrganizationType[] = [
  'SHIPPING_LINE',
  'SHIP_MANAGER',
  'FUEL_BUYER',
  'CHARTERER',
];

const invitationOrganizationTypes = (role: InvitationForm['role']) => (
  role === 'SUPPLIER'
    ? ['FUEL_SUPPLIER' as const]
    : role === 'BUYER'
      ? BUYER_INVITATION_ORG_TYPES
      : []
);

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

// Human labels for the onboarding_attention stage taxonomy (BE service).
const fmtSince = (iso: string, t: TFunction) => {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 48) return t('users.time.hours', { count: hours });
  return t('users.time.days', { count: Math.round(hours / 24) });
};

// Who is stuck at which onboarding step, with an email link to reach out.
// Identity deliberately lives here (operational surface), never in the
// aggregate analytics tabs.
const OutreachPanel: React.FC = () => {
  const { t } = useTranslation('admin');
  const [items, setItems] = useState<OnboardingAttentionItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.admin.onboardingAttention()
      .then(response => { if (!cancelled) setItems(response.items); })
      .catch(() => { /* panel is best-effort; the users table still loads */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (!loaded || items.length === 0) return null;
  return (
    <details className="rounded-lg border border-amber-500/30 bg-amber-500/5" data-testid="outreach-panel">
      <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wide text-amber-500">
        {t('users.outreach.summary', { count: items.length })}
      </summary>
      <ul className="space-y-1.5 px-4 pb-4">
        {items.map(item => (
          <li key={`${item.email}-${item.stage}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-500">
              {t(`users.outreach.stage.${item.stage}`, { defaultValue: t('users.outreach.stage.unknown') })}
            </span>
            <span className="text-verdaxis-text font-medium">{item.name ?? '—'}</span>
            <a href={`mailto:${item.email}`} className="font-mono text-xs text-verdaxis underline decoration-verdaxis/40 underline-offset-2 hover:decoration-verdaxis">
              {item.email}
            </a>
            {item.organization_name && (
              <span className="text-verdaxis-text-muted text-xs">{item.organization_name}</span>
            )}
            <span className="text-verdaxis-text-muted text-xs ml-auto whitespace-nowrap">
              {t('users.outreach.stalled', { time: fmtSince(item.since, t) })}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
};

const FeedbackTab: React.FC = () => {
  const { t, i18n } = useTranslation('admin');
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.admin.feedback()
      .then(response => {
        if (cancelled) return;
        setEntries(response.items);
        setTotal(response.total);
      })
      .catch(err => {
        if (!cancelled) setError(safeAdminError(err, t, i18n.resolvedLanguage ?? i18n.language, 'feedback.loadingError'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [i18n.language, i18n.resolvedLanguage, t]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-verdaxis" />
      </div>
    );
  }
  if (error) return <p role="alert" className="text-sm text-red-400">{error}</p>;
  if (entries.length === 0) {
    return <p className="text-verdaxis-text-muted text-sm py-6 text-center">{t('feedback.empty')}</p>;
  }
  return (
    <div className="space-y-3" data-testid="admin-feedback-list">
      <p className="text-xs text-verdaxis-text-muted">{t('feedback.entries', { count: total })}</p>
      {entries.map(entry => (
        <div key={entry.id} className="rounded-lg border border-verdaxis-border bg-verdaxis-card px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-verdaxis-text-muted mb-1.5">
            <span className="whitespace-nowrap">{fmtDate(entry.created_at, i18n.resolvedLanguage)}</span>
            {entry.user_email ? (
              <a href={`mailto:${entry.user_email}`} className="font-mono text-verdaxis underline decoration-verdaxis/40 underline-offset-2 hover:decoration-verdaxis">
                {entry.user_email}
              </a>
            ) : (
              <span>—</span>
            )}
            {entry.org_name && <span>{entry.org_name}</span>}
            {entry.page && <span className="font-mono ml-auto">{entry.page}</span>}
          </div>
          <p className="text-sm text-verdaxis-text whitespace-pre-wrap">{entry.message}</p>
        </div>
      ))}
    </div>
  );
};

const UsersTab: React.FC = () => {
  const { t, i18n } = useTranslation('admin');
  const language = i18n.resolvedLanguage ?? i18n.language;
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InvitationForm>(EMPTY_INVITATION);
  const [inviteOrganizations, setInviteOrganizations] = useState<AdminInvitationOrganization[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<AdminInvitationResponse | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
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
      setUserError(safeAdminError(error, t, language, 'users.error.load'));
    } finally {
      setLoading(false);
    }
  }, [filter, language, t]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (userId: string) => {
    setReviewing(userId);
    setReviewError(null);
    setReviewNotice(null);
    setVerificationSent(false);
    try {
      setReviewCase(await api.admin.reviewCase(userId));
    } catch (error) {
      setUserError(safeAdminError(error, t, language, 'users.error.review'));
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
      setUserError(safeAdminError(error, t, language, 'users.error.reject'));
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

  const openInvite = async () => {
    setInviteOpen(true);
    setInviteLoading(true);
    setInviteError(null);
    setInvitation(null);
    setInviteCopied(false);
    setInviteForm(EMPTY_INVITATION);
    try {
      const data = await api.admin.invitationOrganizations();
      const organizations = data.items ?? [];
      setInviteOrganizations(organizations);
    } catch (error) {
      setInviteError(safeAdminError(error, t, language, 'users.error.organizations'));
    } finally {
      setInviteLoading(false);
    }
  };

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteError(null);
    setInvitation(null);
    setInviteCopied(false);
  };

  const handleInviteConfirm = async () => {
    if (invitation) {
      closeInvite();
      return;
    }
    const role = inviteForm.role;
    const usesExistingOrganization = inviteForm.organizationMode === 'existing';
    if (
      !role
      || (usesExistingOrganization && !inviteForm.organization_id)
      || (!usesExistingOrganization && (
        !inviteForm.new_organization.name.trim()
        || !inviteForm.new_organization.type
        || !inviteForm.new_organization.country_code
      ))
    ) return;
    setInviteSubmitting(true);
    setInviteError(null);
    try {
      const identity = {
        role,
        email: inviteForm.email.trim().toLowerCase(),
        first_name: inviteForm.first_name.trim(),
        last_name: inviteForm.last_name?.trim() || null,
      };
      const input: AdminInvitationInput = usesExistingOrganization
        ? { ...identity, organization_id: inviteForm.organization_id }
        : {
            ...identity,
            new_organization: {
              name: inviteForm.new_organization.name.trim(),
              type: inviteForm.new_organization.type as AdminInvitationOrganizationType,
              country_code: inviteForm.new_organization.country_code,
              tax_id: inviteForm.new_organization.tax_id.trim() || null,
            },
          };
      const created = await api.admin.createInvitation(input);
      setInvitation(created);
      await load();
    } catch (error) {
      setInviteError(safeAdminError(error, t, language, 'users.error.invite'));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const eligibleInviteOrganizations = inviteForm.role
    ? inviteOrganizations.filter(organization => defaultMarketSupportView(organization.type) === inviteForm.role)
    : [];
  const eligibleNewOrganizationTypes = invitationOrganizationTypes(inviteForm.role);
  const countries = getAvailableCountries(language);
  const inviteOrganizationReady = inviteForm.organizationMode === 'existing'
    ? Boolean(inviteForm.organization_id)
    : Boolean(
        inviteForm.new_organization.name.trim()
        && inviteForm.new_organization.type
        && inviteForm.new_organization.country_code,
      );

  const copyInvitation = async () => {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.acceptance_url);
      setInviteCopied(true);
    } catch (error) {
      console.error('[admin] copy invitation', error);
      setInviteError(t('users.error.copy'));
    }
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
        setReviewNotice(t('review.verificationSent'));
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
      setReviewError(safeAdminError(error, t, language, 'users.error.reviewStep'));
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
      if (!organizationId || !user.org_name) throw new Error('ORGANIZATION_UNRESOLVED');
      const organization: SupportOrganization = {
        id: organizationId,
        name: user.org_name,
        domain: null,
        type: String(user.org_type ?? 'REAL').toUpperCase(),
      };
      setEntryOrganization(organization);
      setEntry(await api.marketSupport.entry(organizationId));
    } catch (error) {
      setEntryError(safeAdminError(error, t, language, error instanceof Error && error.message === 'ORGANIZATION_UNRESOLVED' ? 'users.error.resolveOrganization' : 'users.error.eligibility'));
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
        setEntryError(t('users.error.contextReplacement'));
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
      setEntryError(safeAdminError(error, t, language, 'users.error.replaceContext'));
    }
  };

  const resumeContext = async () => {
    setEntryError(null);
    try {
      const active = await resume();
      if (!active) throw new Error('NO_ACTIVE_CONTEXT');
      navigate('/app/home');
    } catch (error) {
      setEntryError(safeAdminError(error, t, language, error instanceof Error && error.message === 'NO_ACTIVE_CONTEXT' ? 'users.error.noContext' : 'users.error.resumeContext'));
    }
  };

  const reviewAction = reviewCase ? nextReviewAction(reviewCase) : null;
  const pendingJoin = reviewCase?.requested_organizations.find(request => request.status === 'PENDING');
  const reviewOrganization = pendingJoin?.organization ?? reviewCase?.current_organization ?? null;
  const reviewConfirmText = reviewAction?.kind === 'resend'
    ? (verificationSent ? t('review.verificationSent') : t('review.sendVerification'))
    : reviewAction?.kind === 'account'
      ? t('review.approveAccount')
      : reviewAction?.kind === 'organization'
        ? t('review.approveOrganization')
        : reviewAction?.kind === 'membership'
          ? t('review.approveMembership')
          : t('review.complete');

  return (
    <div className="space-y-4">
      <OutreachPanel />
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === value
                ? 'bg-verdaxis text-white'
                : 'bg-verdaxis-border/40 text-verdaxis-text-muted hover:text-verdaxis-text'
            }`}
          >
            {t(`users.filters.${value}`)}
          </button>
        ))}
        <span className="ml-auto text-xs text-verdaxis-text-muted self-center">
          {t('users.count', { count: total })}
        </span>
        <button
          type="button"
          onClick={() => { void openInvite(); }}
          className="inline-flex items-center gap-1.5 rounded-full bg-verdaxis px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
        >
          <UserPlus size={13} />
          {t('users.invite')}
        </button>
        <button type="button" onClick={() => { void resumeContext(); }} className="rounded-full border border-verdaxis px-3 py-1.5 text-xs font-semibold text-verdaxis hover:bg-verdaxis/10">
          {t('users.resumeContext')}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-verdaxis" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-verdaxis-text-muted text-sm py-6 text-center">
          {filter === 'ALL'
            ? t('users.empty')
            : t('users.emptyFiltered', { status: t(`users.filters.${filter}`) })}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-verdaxis-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-verdaxis-border text-verdaxis-text-muted text-xs uppercase">
                <th className="text-left px-4 py-3">{t('users.columns.name')}</th>
                <th className="text-left px-4 py-3">{t('users.columns.email')}</th>
                <th className="text-left px-4 py-3">{t('users.columns.organization')}</th>
                <th className="text-left px-4 py-3">{t('users.columns.role')}</th>
                <th className="text-left px-4 py-3">{t('users.columns.status')}</th>
                <th className="text-left px-4 py-3">{t('users.columns.reached')}</th>
                <th className="text-left px-4 py-3">{t('users.columns.joined')}</th>
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
                    <td className="px-4 py-3 font-mono text-xs">
                      <a href={`mailto:${u.email}`} className="text-verdaxis-text-muted underline decoration-transparent underline-offset-2 transition-colors hover:text-verdaxis hover:decoration-verdaxis/60">
                        {u.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-verdaxis-text-muted">
                      {canEnterOrganization ? (
                        <button
                          type="button"
                          onClick={() => handleEnterOrganization(u)}
                          disabled={entryLoading}
                          className="text-left font-semibold text-verdaxis underline decoration-verdaxis/40 underline-offset-4 transition-colors hover:decoration-verdaxis disabled:opacity-50"
                          aria-label={t('users.enterOrganization', { organization: u.org_name })}
                        >
                          {u.org_name}
                          {u.org_type && (
                            <span className="ml-1 text-xs font-normal opacity-60 capitalize">
                              ({t(`users.organizationType.${u.org_type}`, { defaultValue: t('users.organizationType.unknown') })})
                            </span>
                          )}
                        </button>
                      ) : (
                        <>
                          {displayOrganizationName ?? '—'}
                          {displayOrganizationType && (
                            <span className="ml-1 text-xs opacity-60 capitalize">
                              ({t(`users.organizationType.${displayOrganizationType}`, { defaultValue: t('users.organizationType.unknown') })})
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-verdaxis-text-muted">{t(`users.role.${u.role}`, { defaultValue: t('users.role.unknown') })}</td>
                    <td className="px-4 py-3">{statusBadge(u.status, t)}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const stage = journeyStage(u, t);
                        return (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${stage.cls}`}
                            title={u.last_login ? t('users.lastLogin', { date: fmtDate(u.last_login, language) }) : t('users.neverLoggedIn')}
                            data-testid={`journey-${u.id}`}
                          >
                            {stage.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-verdaxis-text-muted text-xs whitespace-nowrap">
                      {fmtDate(u.created_at, language)}
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
                            {t('users.review')}
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
                            {t('users.reject')}
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
                            {t('users.review')}
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
        isOpen={inviteOpen}
        onClose={closeInvite}
        onConfirm={() => { void handleInviteConfirm(); }}
        title={invitation ? t('invite.readyTitle') : t('invite.title')}
        message={invitation
          ? t('invite.readyMessage')
          : t('invite.message')}
        confirmText={invitation ? t('invite.done') : t('invite.generate')}
        cancelText={invitation ? '' : t('marketSupport.cancel')}
        variant={invitation ? 'success' : 'info'}
        isLoading={inviteSubmitting}
        confirmDisabled={inviteLoading || !inviteForm.email || !inviteForm.first_name || !inviteForm.role || !inviteOrganizationReady}
        maxWidth="lg"
        compact
      >
        {invitation ? (
          <div className="mt-5 space-y-3">
            <div className="text-sm text-verdaxis-text-muted">
              <span className="font-semibold text-verdaxis-text">{invitation.email}</span>
              <span className="mx-2">·</span>
              {invitation.organization_name}
              <span className="mx-2">·</span>
              {t(`users.role.${invitation.role}`)}
            </div>
            <label htmlFor="admin-invitation-link" className="block text-xs font-semibold uppercase text-verdaxis-text-muted">
              {t('invite.link')}
            </label>
            <div className="flex gap-2">
              <input
                id="admin-invitation-link"
                readOnly
                value={invitation.acceptance_url}
                className="min-w-0 flex-1 rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 font-mono text-xs text-verdaxis-text"
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => { void copyInvitation(); }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-verdaxis-border text-verdaxis-text-muted hover:border-verdaxis hover:text-verdaxis"
                aria-label={t('invite.copy')}
                title={t('invite.copy')}
              >
                {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {invitation.reissued && (
              <p className="text-xs text-amber-400">{t('invite.reissued')}</p>
            )}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-verdaxis-text-muted">
              {t('invite.firstName')}
              <input
                required
                value={inviteForm.first_name}
                onChange={(event) => setInviteForm({ ...inviteForm, first_name: event.target.value })}
                className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text"
              />
            </label>
            <label className="text-sm text-verdaxis-text-muted">
              {t('invite.lastName')}
              <input
                value={inviteForm.last_name ?? ''}
                onChange={(event) => setInviteForm({ ...inviteForm, last_name: event.target.value || null })}
                className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text"
              />
            </label>
            <label className="text-sm text-verdaxis-text-muted sm:col-span-2">
              {t('invite.email')}
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
                className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text"
                placeholder="name@company.com"
              />
            </label>
            <label className="text-sm text-verdaxis-text-muted">
              {t('invite.role')}
              <select
                value={inviteForm.role}
                onChange={(event) => setInviteForm({
                  ...inviteForm,
                  role: event.target.value as InvitationForm['role'],
                  organization_id: '',
                  new_organization: {
                    ...inviteForm.new_organization,
                    type: '',
                  },
                })}
                className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text"
              >
                <option value="">{t('invite.selectRole')}</option>
                <option value="BUYER">{t('users.role.BUYER')}</option>
                <option value="SUPPLIER">{t('users.role.SUPPLIER')}</option>
              </select>
            </label>
            <div className="sm:col-span-2" role="group" aria-label={t('invite.organizationSource')}>
              <div className="grid grid-cols-2 rounded-lg border border-verdaxis-border bg-verdaxis-bg p-1">
                {(['existing', 'new'] as InvitationOrganizationMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInviteForm({
                      ...inviteForm,
                      organizationMode: mode,
                      organization_id: '',
                      new_organization: { name: '', type: '', country_code: '', tax_id: '' },
                    })}
                    className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                      inviteForm.organizationMode === mode
                        ? 'bg-verdaxis text-white'
                        : 'text-verdaxis-text-muted hover:text-verdaxis-text'
                    }`}
                    aria-pressed={inviteForm.organizationMode === mode}
                  >
                    {t(`invite.organizationMode.${mode}`)}
                  </button>
                ))}
              </div>
            </div>
            {inviteForm.organizationMode === 'existing' ? (
              <label className="text-sm text-verdaxis-text-muted sm:col-span-2">
                {t('invite.organization')}
                <select
                  value={inviteForm.organization_id}
                  onChange={(event) => setInviteForm({ ...inviteForm, organization_id: event.target.value })}
                  disabled={inviteLoading || !inviteForm.role || eligibleInviteOrganizations.length === 0}
                  className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text disabled:opacity-50"
                >
                  <option value="">{t('invite.selectOrganization')}</option>
                  {eligibleInviteOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}{organization.domain ? ` — ${organization.domain}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="text-sm text-verdaxis-text-muted sm:col-span-2">
                  {t('invite.organizationName')}
                  <input
                    required
                    value={inviteForm.new_organization.name}
                    onChange={(event) => setInviteForm({
                      ...inviteForm,
                      new_organization: { ...inviteForm.new_organization, name: event.target.value },
                    })}
                    className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text"
                  />
                </label>
                <label className="text-sm text-verdaxis-text-muted">
                  {t('invite.organizationType')}
                  <select
                    value={inviteForm.new_organization.type}
                    onChange={(event) => setInviteForm({
                      ...inviteForm,
                      new_organization: {
                        ...inviteForm.new_organization,
                        type: event.target.value as InvitationForm['new_organization']['type'],
                      },
                    })}
                    disabled={!inviteForm.role}
                    className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text disabled:opacity-50"
                  >
                    <option value="">{t('invite.selectOrganizationType')}</option>
                    {eligibleNewOrganizationTypes.map(type => (
                      <option key={type} value={type}>{t(`users.organizationType.${type}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-verdaxis-text-muted">
                  {t('invite.country')}
                  <select
                    value={inviteForm.new_organization.country_code}
                    onChange={(event) => setInviteForm({
                      ...inviteForm,
                      new_organization: { ...inviteForm.new_organization, country_code: event.target.value },
                    })}
                    className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text"
                  >
                    <option value="">{t('invite.selectCountry')}</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-verdaxis-text-muted sm:col-span-2">
                  {t('invite.taxId')}
                  <input
                    value={inviteForm.new_organization.tax_id}
                    onChange={(event) => setInviteForm({
                      ...inviteForm,
                      new_organization: { ...inviteForm.new_organization, tax_id: event.target.value },
                    })}
                    className="mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text"
                  />
                </label>
              </>
            )}
            {!inviteLoading && inviteForm.organizationMode === 'existing' && inviteForm.role && eligibleInviteOrganizations.length === 0 && !inviteError && (
              <p className="sm:col-span-2 text-sm text-amber-400">
                {t('invite.noOrganizations', { role: t(`users.role.${inviteForm.role}`) })}
              </p>
            )}
          </div>
        )}
        {inviteError && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {inviteError}
          </p>
        )}
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(reviewCase)}
        onClose={closeReview}
        onConfirm={() => { void handleReviewAction(); }}
        title={t('review.title', { account: reviewCase?.email ?? t('review.accountFallback') })}
        message={t('review.message')}
        confirmText={reviewConfirmText}
        cancelText={t('marketSupport.close')}
        variant={reviewAction ? 'info' : 'success'}
        isLoading={reviewActioning}
        confirmDisabled={!reviewAction || (reviewAction.kind === 'resend' && verificationSent)}
        maxWidth="lg"
        compact
      >
        {reviewCase && (
          <div className="mt-5 divide-y divide-verdaxis-border rounded-lg border border-verdaxis-border">
            {[
              [t('review.email'), reviewCase.email_verified ? t('users.journey.verified') : t('review.awaitingVerification'), reviewCase.email_verified],
              [t('review.account'), t(`users.status.${reviewCase.account_status}`, { defaultValue: t('users.status.unknown') }), reviewCase.account_status === 'APPROVED'],
              [t('review.organization'), reviewOrganization ? `${reviewOrganization.name} · ${t(`users.status.${reviewOrganization.verification_status}`, { defaultValue: t('users.status.unknown') })}` : t('review.notRequested'), reviewOrganization?.verification_status === 'APPROVED'],
              [t('review.membership'), reviewCase.current_organization ? t('users.status.APPROVED') : pendingJoin ? t(`users.status.${pendingJoin.status}`, { defaultValue: t('users.status.unknown') }) : t('review.notRequested'), Boolean(reviewCase.current_organization)],
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
        title={t('review.replaceTitle')}
        message={t('review.replaceMessage')}
        confirmText={t('review.replace')}
        variant="warning"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type AdminTab = 'analytics' | 'users' | 'feedback';

// Tab state lives in the URL so /app/admin and /app/admin/users are
// bookmarkable and survive refresh (Sprint 3 item 11).
const ADMIN_TAB_PATHS: Record<AdminTab, string> = {
  analytics: '/app/admin',
  users: '/app/admin/users',
  feedback: '/app/admin/feedback',
};

export const AdminDashboard: React.FC = () => {
  const { t, ready } = useNamespace('admin');
  const location = useLocation();
  const activeTab: AdminTab = location.pathname.startsWith('/app/admin/users')
      ? 'users'
      : location.pathname.startsWith('/app/admin/feedback')
        ? 'feedback'
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
          { key: 'analytics', label: t('tabs.analytics'), icon: <BarChart3 size={15} /> },
          { key: 'users',     label: t('tabs.users'),     icon: <Users size={15} />    },
          { key: 'feedback',  label: t('tabs.feedback'),  icon: <MessageSquareText size={15} /> },
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

      {/* Feedback tab */}
      {activeTab === 'feedback' && <FeedbackTab />}

    </div>
  );
};
