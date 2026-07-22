import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  FileCheck2,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { api } from '../../services/api';
import {
  marketSupportApi,
  type AdminCapability,
  type AssistedOrderCreateRequest,
  type AssistedOrderUpdateRequest,
  type MarketSupportContext,
  type MarketSupportOrderView,
  type MarketSupportOrganization,
  type PostOnlyPreview,
  type SupportAuthorization,
  type SupportAuthorizationCreateRequest,
  type SupportOrderInput,
} from '../../services/marketSupportApi';
import type { DeliveryPoint, Product } from '../../types';
import {
  getAvailabilityWindowOptions,
  SPOT_WINDOW,
} from '../../utils/availabilityWindow';
import { formatMarketProduct, getOrderDisplayName } from '../../utils/marketProduct';

interface ListingFormState {
  accountableUserId: string;
  authorizationId: string;
  productId: string;
  deliveryPointId: string;
  quantityMt: string;
  pricePerMtUsd: string;
  availabilityWindow: string;
  expiresAtLocal: string;
  certificationScheme: string;
  specificationStandard: string;
  carbonIntensity: string;
  feedstock: string;
  origin: string;
  supportCaseReference: string;
  reasonCode: string;
}

interface AuthorizationFormState {
  contactName: string;
  contactEmail: string;
  evidenceReference: string;
  supportCaseReference: string;
  validFromLocal: string;
  validUntilLocal: string;
  productId: string;
  deliveryPointId: string;
  minPrice: string;
  maxPrice: string;
  maxQuantity: string;
  maxOpenQuantity: string;
  maxTtlHours: string;
  maxUses: string;
}

type ReviewAction = 'create' | 'edit';

const inputClass = 'w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-sm text-verdaxis-text outline-none transition focus:border-verdaxis focus:ring-1 focus:ring-verdaxis';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-verdaxis-text-muted';

function localDateTime(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(localValue: string): string {
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid date and time.');
  return date.toISOString();
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createListingForm(): ListingFormState {
  return {
    accountableUserId: '',
    authorizationId: '',
    productId: '',
    deliveryPointId: '',
    quantityMt: '1000',
    pricePerMtUsd: '',
    availabilityWindow: SPOT_WINDOW,
    expiresAtLocal: localDateTime(24),
    certificationScheme: 'ISCC EU',
    specificationStandard: 'IMPCA',
    carbonIntensity: '',
    feedstock: '',
    origin: '',
    supportCaseReference: '',
    reasonCode: 'CUSTOMER_ONBOARDING',
  };
}

function createAuthorizationForm(): AuthorizationFormState {
  return {
    contactName: '',
    contactEmail: '',
    evidenceReference: '',
    supportCaseReference: '',
    validFromLocal: localDateTime(0),
    validUntilLocal: localDateTime(24 * 7),
    productId: '',
    deliveryPointId: '',
    minPrice: '',
    maxPrice: '',
    maxQuantity: '1000',
    maxOpenQuantity: '2500',
    maxTtlHours: '168',
    maxUses: '',
  };
}

function authorizationLabel(authorization: SupportAuthorization): string {
  const remainingUses = authorization.max_uses == null
    ? 'standing'
    : `${Math.max(authorization.max_uses - authorization.uses_count, 0)} use(s) left`;
  return `${authorization.support_case_reference || authorization.id.slice(0, 8)} · ${remainingUses}`;
}

export const MarketSupportWorkspace: React.FC = () => {
  const [capabilities, setCapabilities] = useState<AdminCapability[]>([]);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [organizations, setOrganizations] = useState<MarketSupportOrganization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<MarketSupportOrganization | null>(null);
  const [context, setContext] = useState<MarketSupportContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  const [form, setForm] = useState<ListingFormState>(createListingForm);
  const [editing, setEditing] = useState<MarketSupportOrderView | null>(null);
  const [preview, setPreview] = useState<PostOnlyPreview | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);

  const [showAuthorizationForm, setShowAuthorizationForm] = useState(false);
  const [authorizationForm, setAuthorizationForm] = useState<AuthorizationFormState>(createAuthorizationForm);
  const [authorizationBusy, setAuthorizationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const availabilityOptions = useMemo(() => getAvailabilityWindowOptions(), []);
  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active && product.market_product),
    [products],
  );
  const activeDeliveryPoints = useMemo(
    () => deliveryPoints.filter((point) => point.is_active !== false),
    [deliveryPoints],
  );
  const canList = capabilities.includes('MARKET_SUPPORT_LISTINGS');
  const canManageAuthorizations = capabilities.includes('MARKET_SUPPORT_AUTHORIZATIONS');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      marketSupportApi.capabilities(),
      api.catalog.products().catch(() => [] as Product[]),
      api.catalog.deliveryPoints().catch(() => [] as DeliveryPoint[]),
    ]).then(([nextCapabilities, nextProducts, nextDeliveryPoints]) => {
      if (cancelled) return;
      setCapabilities(nextCapabilities);
      setProducts(nextProducts);
      setDeliveryPoints(nextDeliveryPoints);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : 'Market support is unavailable.');
    }).finally(() => {
      if (!cancelled) setCapabilitiesLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const refreshContext = useCallback(async (organizationId?: string) => {
    const id = organizationId || selectedOrganization?.id;
    if (!id) return;
    setContextLoading(true);
    setError(null);
    try {
      const next = await marketSupportApi.context(id);
      setContext(next);
      setSelectedOrganization(next.organization);
      setForm((current) => {
        const eligible = next.eligible_principals.filter((principal) => principal.eligible);
        const usable = next.active_authorizations.filter((authorization) => authorization.usable_by_current_admin);
        const selectedAuthorization = usable.find((item) => item.id === current.authorizationId) || usable[0];
        return {
          ...current,
          accountableUserId: eligible.some((item) => item.id === current.accountableUserId)
            ? current.accountableUserId
            : eligible[0]?.id || '',
          authorizationId: selectedAuthorization?.id || '',
          productId: selectedAuthorization?.product_id || current.productId || activeProducts[0]?.id || '',
          deliveryPointId: selectedAuthorization?.delivery_point_id || current.deliveryPointId || activeDeliveryPoints[0]?.id || '',
          supportCaseReference: selectedAuthorization?.support_case_reference || current.supportCaseReference,
        };
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load organization support context.');
    } finally {
      setContextLoading(false);
    }
  }, [activeDeliveryPoints, activeProducts, selectedOrganization?.id]);

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) return;
    setSearching(true);
    setError(null);
    setNotice(null);
    try {
      setOrganizations(await marketSupportApi.searchOrganizations(normalized));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Organization search failed.');
    } finally {
      setSearching(false);
    }
  };

  const enterOrganization = async (organization: MarketSupportOrganization) => {
    setSelectedOrganization(organization);
    setContext(null);
    setEditing(null);
    setPreview(null);
    setReviewAction(null);
    setForm(createListingForm());
    await refreshContext(organization.id);
  };

  const exitWorkspace = () => {
    setSelectedOrganization(null);
    setContext(null);
    setEditing(null);
    setPreview(null);
    setReviewAction(null);
    setAcknowledged(false);
    setForm(createListingForm());
    setNotice(null);
    setError(null);
  };

  const selectedAuthorization = context?.active_authorizations.find(
    (authorization) => authorization.id === form.authorizationId,
  ) || null;

  useEffect(() => {
    if (!selectedAuthorization) return;
    setForm((current) => ({
      ...current,
      productId: selectedAuthorization.product_id || current.productId,
      deliveryPointId: selectedAuthorization.delivery_point_id || current.deliveryPointId,
      supportCaseReference: selectedAuthorization.support_case_reference || current.supportCaseReference,
    }));
  }, [selectedAuthorization]);

  const buildOrder = (): SupportOrderInput => {
    const quantity = Number(form.quantityMt);
    const price = Number(form.pricePerMtUsd);
    const carbonIntensity = Number(form.carbonIntensity);
    if (!form.productId || !form.deliveryPointId || !form.accountableUserId || !form.authorizationId) {
      throw new Error('Select an accountable customer user, mandate, product, and delivery point.');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero.');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Price must be greater than zero.');
    if (!Number.isFinite(carbonIntensity) || carbonIntensity <= 0) {
      throw new Error('Carbon intensity must be greater than zero.');
    }
    if (!form.specificationStandard.trim() || !form.feedstock.trim() || !form.origin.trim()) {
      throw new Error('Specification, feedstock, and origin are required for supplier asks.');
    }
    return {
      side: 'ASK',
      product_id: form.productId,
      delivery_point_id: form.deliveryPointId,
      quantity_mt: quantity,
      price_per_mt_usd: price,
      availability_window: form.availabilityWindow,
      expires_at: toIso(form.expiresAtLocal),
      is_anonymous: true,
      certifications: [form.certificationScheme.trim()],
      certification_declared: true,
      certification_scheme: form.certificationScheme.trim(),
      specification_standard: form.specificationStandard.trim(),
      msds_available: true,
      carbon_intensity_gco2_mj: carbonIntensity,
      feedstock: form.feedstock.trim(),
      origin: form.origin.trim(),
    };
  };

  const actionBase = () => ({
    accountable_user_id: form.accountableUserId,
    support_authorization_id: form.authorizationId,
    reason_code: form.reasonCode.trim().toUpperCase(),
    support_case_reference: form.supportCaseReference.trim() || null,
  });

  const previewCreate = async () => {
    if (!selectedOrganization) return;
    setMutationBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await marketSupportApi.preview(selectedOrganization.id, {
        ...actionBase(),
        order: buildOrder(),
      });
      setPreview(result);
      if (result.valid) {
        setReviewAction('create');
        setAcknowledged(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Preview failed.');
    } finally {
      setMutationBusy(false);
    }
  };

  const reviewEdit = () => {
    try {
      buildOrder();
      setPreview({
        valid: true,
        would_cross: false,
        indeterminate: false,
        best_executable_opposing_price_per_mt_usd: null,
        similar_open_order_count: 0,
        warnings: ['The final edit is revalidated atomically as post-only against the current market.'],
      });
      setReviewAction('edit');
      setAcknowledged(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Review failed.');
    }
  };

  const resetListingForm = () => {
    setEditing(null);
    setPreview(null);
    setReviewAction(null);
    setAcknowledged(false);
    setForm((current) => ({
      ...createListingForm(),
      accountableUserId: current.accountableUserId,
      authorizationId: current.authorizationId,
      productId: selectedAuthorization?.product_id || activeProducts[0]?.id || '',
      deliveryPointId: selectedAuthorization?.delivery_point_id || activeDeliveryPoints[0]?.id || '',
      supportCaseReference: selectedAuthorization?.support_case_reference || '',
    }));
  };

  const publishReviewedAction = async () => {
    if (!selectedOrganization || !reviewAction || !acknowledged) return;
    setMutationBusy(true);
    setError(null);
    try {
      if (reviewAction === 'create') {
        const body: AssistedOrderCreateRequest = {
          ...actionBase(),
          order: buildOrder(),
          acknowledge_executable_resting_order: true,
        };
        await marketSupportApi.create(selectedOrganization.id, body);
        setNotice('Post-only listing published and customer contacts notified.');
      } else if (editing?.attribution) {
        const order = buildOrder();
        const body: AssistedOrderUpdateRequest = {
          ...actionBase(),
          expected_support_version: editing.attribution.support_version,
          expected_order_updated_at: editing.order_updated_at,
          acknowledge_executable_resting_order: true,
          changes: {
            quantity_mt: order.quantity_mt,
            price_per_mt_usd: order.price_per_mt_usd,
            expires_at: order.expires_at,
            certifications: order.certifications,
            certification_declared: true,
            certification_scheme: order.certification_scheme,
            specification_standard: order.specification_standard,
            msds_available: true,
            carbon_intensity_gco2_mj: order.carbon_intensity_gco2_mj,
            feedstock: order.feedstock,
            origin: order.origin,
          },
        };
        await marketSupportApi.update(selectedOrganization.id, editing.order.id, body);
        setNotice('Assisted listing updated and customer contacts notified.');
      }
      resetListingForm();
      await refreshContext(selectedOrganization.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Listing action failed.');
    } finally {
      setMutationBusy(false);
    }
  };

  const beginEdit = (item: MarketSupportOrderView) => {
    if (!item.attribution) return;
    const order = item.order;
    const expiry = order.expires_at ? new Date(order.expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const localExpiry = new Date(expiry.getTime() - expiry.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    setEditing(item);
    setForm({
      accountableUserId: item.attribution.accountable_user_id,
      authorizationId: item.attribution.support_authorization_id,
      productId: order.product_id || '',
      deliveryPointId: order.delivery_point_id || '',
      quantityMt: String(order.quantity_mt),
      pricePerMtUsd: String(order.price_per_mt_usd),
      availabilityWindow: order.availability_window,
      expiresAtLocal: localExpiry,
      certificationScheme: order.certification_scheme || order.certifications[0] || 'ISCC EU',
      specificationStandard: order.specification_standard || '',
      carbonIntensity: order.carbon_intensity_gco2_mj == null ? '' : String(order.carbon_intensity_gco2_mj),
      feedstock: order.feedstock || '',
      origin: order.origin || '',
      supportCaseReference: item.attribution.support_case_reference || '',
      reasonCode: 'CUSTOMER_ONBOARDING_UPDATE',
    });
    setPreview(null);
    setReviewAction(null);
    setAcknowledged(false);
    setNotice(null);
    setError(null);
  };

  const cancelOrder = async (item: MarketSupportOrderView) => {
    if (!selectedOrganization || !item.attribution) return;
    if (!window.confirm('Cancel the remaining quantity? Existing trades are not reversed.')) return;
    setMutationBusy(true);
    setError(null);
    try {
      await marketSupportApi.cancel(selectedOrganization.id, item.order.id, {
        accountable_user_id: item.attribution.accountable_user_id,
        support_authorization_id: item.attribution.support_authorization_id,
        expected_support_version: item.attribution.support_version,
        expected_order_updated_at: item.order_updated_at,
        reason_code: 'CUSTOMER_REQUESTED_CANCELLATION',
        support_case_reference: item.attribution.support_case_reference,
      });
      setNotice('Remaining quantity cancelled; existing trades were preserved.');
      await refreshContext(selectedOrganization.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Cancellation failed.');
    } finally {
      setMutationBusy(false);
    }
  };

  const createAuthorization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrganization) return;
    const maxQuantity = Number(authorizationForm.maxQuantity);
    const maxOpenQuantity = Number(authorizationForm.maxOpenQuantity);
    const maxTtlHours = Number(authorizationForm.maxTtlHours);
    if (!Number.isFinite(maxQuantity) || !Number.isFinite(maxOpenQuantity) || !Number.isFinite(maxTtlHours)) {
      setError('Authorization quantity and TTL limits must be valid numbers.');
      return;
    }
    const body: SupportAuthorizationCreateRequest = {
      authorized_contact_name: authorizationForm.contactName.trim(),
      authorized_contact_email: authorizationForm.contactEmail.trim(),
      evidence_reference: authorizationForm.evidenceReference.trim(),
      support_case_reference: authorizationForm.supportCaseReference.trim() || null,
      scopes: [
        'PUBLISH_POST_ONLY_EXECUTABLE_ORDER',
        'EDIT_SUPPORT_MANAGED_ORDER',
        'CANCEL_SUPPORT_MANAGED_ORDER',
      ],
      valid_from: toIso(authorizationForm.validFromLocal),
      valid_until: toIso(authorizationForm.validUntilLocal),
      product_id: authorizationForm.productId || null,
      delivery_point_id: authorizationForm.deliveryPointId || null,
      min_price_per_mt_usd: numberOrNull(authorizationForm.minPrice),
      max_price_per_mt_usd: numberOrNull(authorizationForm.maxPrice),
      max_quantity_mt_per_order: maxQuantity,
      max_total_open_quantity_mt: maxOpenQuantity,
      max_order_ttl_hours: maxTtlHours,
      max_uses: numberOrNull(authorizationForm.maxUses),
    };
    setAuthorizationBusy(true);
    setError(null);
    try {
      await marketSupportApi.createAuthorization(selectedOrganization.id, body);
      setAuthorizationForm(createAuthorizationForm());
      setShowAuthorizationForm(false);
      setNotice('Support authorization recorded. A different listing operator must use it.');
      await refreshContext(selectedOrganization.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authorization creation failed.');
    } finally {
      setAuthorizationBusy(false);
    }
  };

  const revokeAuthorization = async (authorization: SupportAuthorization) => {
    if (!selectedOrganization) return;
    const reason = window.prompt('Reason for revocation:');
    if (!reason?.trim()) return;
    setAuthorizationBusy(true);
    setError(null);
    try {
      await marketSupportApi.revokeAuthorization(selectedOrganization.id, authorization.id, reason.trim());
      setNotice('Authorization revoked and remaining support-managed quantities cancelled.');
      await refreshContext(selectedOrganization.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authorization revocation failed.');
    } finally {
      setAuthorizationBusy(false);
    }
  };

  if (capabilitiesLoading) {
    return <div className="flex min-h-[360px] items-center justify-center text-verdaxis-text-muted"><Loader2 className="mr-2 animate-spin" /> Loading market-support permissions…</div>;
  }

  if (!canList && !canManageAuthorizations) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <ShieldCheck className="mx-auto mb-3 text-amber-400" size={36} />
        <h2 className="text-lg font-bold text-verdaxis-text">Market-support capability required</h2>
        <p className="mt-2 text-sm text-verdaxis-text-muted">An ADMIN role alone does not grant access to customer market activity.</p>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-5">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 text-verdaxis" />
            <div>
              <h2 className="text-lg font-bold text-verdaxis-text">Select a verified supplier organization</h2>
              <p className="mt-1 text-sm text-verdaxis-text-muted">The organization is explicit in every support API path. Selecting it does not change your login or organization.</p>
            </div>
          </div>
          <form onSubmit={runSearch} className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-verdaxis-text-muted" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search name or domain" />
            </div>
            <button disabled={searching || query.trim().length < 2} className="rounded-lg bg-verdaxis px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {searching ? <Loader2 className="animate-spin" size={17} /> : 'Search'}
            </button>
          </form>
        </div>
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((organization) => (
            <button key={organization.id} onClick={() => void enterOrganization(organization)} className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-4 text-left transition hover:border-verdaxis/60 hover:bg-verdaxis-border/10">
              <div className="font-bold text-verdaxis-text">{organization.name}</div>
              <div className="mt-1 text-xs text-verdaxis-text-muted">{organization.domain || 'No domain'} · {organization.type}</div>
              <div className="mt-3 flex gap-2 text-[10px] font-bold uppercase tracking-wide">
                <span className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-400">{organization.verification_status}</span>
                <span className="rounded bg-slate-500/15 px-2 py-1 text-slate-300">{organization.provenance}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const eligiblePrincipals = context?.eligible_principals.filter((principal) => principal.eligible) || [];
  const usableAuthorizations = context?.active_authorizations.filter((authorization) => authorization.usable_by_current_admin) || [];
  const activeOrders = context?.orders.filter((item) => item.order.status === 'OPEN' || item.order.status === 'PARTIALLY_FILLED') || [];
  const fixedProduct = Boolean(selectedAuthorization?.product_id || editing);
  const fixedDeliveryPoint = Boolean(selectedAuthorization?.delivery_point_id || editing);

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-40 flex flex-col gap-3 rounded-xl border border-amber-400/40 bg-amber-500/15 p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-amber-200"><AlertTriangle size={17} /> Working on behalf of {selectedOrganization.name}</div>
          <div className="mt-1 text-xs text-amber-100/70">You remain authenticated as yourself. Live listings can later be accepted by another participant.</div>
        </div>
        <button onClick={exitWorkspace} className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-400/10"><LogOut size={15} /> Exit support workspace</button>
      </div>

      {(error || notice) && (
        <div className={`rounded-lg border p-3 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
          {error || notice}
        </div>
      )}

      {contextLoading || !context ? (
        <div className="flex min-h-[320px] items-center justify-center text-verdaxis-text-muted"><Loader2 className="mr-2 animate-spin" /> Loading organization context…</div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
            <div className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-verdaxis-text">{editing ? 'Review assisted listing edit' : 'Set up a post-only supplier listing'}</h2>
                  <p className="mt-1 text-xs text-verdaxis-text-muted">Final publication revalidates customer eligibility, mandate bounds, market compatibility, and crossing inside one transaction.</p>
                </div>
                {editing && <button onClick={resetListingForm} className="rounded-lg border border-verdaxis-border p-2 text-verdaxis-text-muted hover:text-verdaxis-text" title="Stop editing"><X size={17} /></button>}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label><span className={labelClass}>Accountable customer user</span><select value={form.accountableUserId} disabled={Boolean(editing)} onChange={(event) => setForm((current) => ({ ...current, accountableUserId: event.target.value }))} className={inputClass}><option value="">Select eligible supplier</option>{eligiblePrincipals.map((principal) => <option key={principal.id} value={principal.id}>{[principal.first_name, principal.last_name].filter(Boolean).join(' ') || principal.email} · {principal.email}</option>)}</select></label>
                <label><span className={labelClass}>Support authorization</span><select value={form.authorizationId} disabled={Boolean(editing)} onChange={(event) => setForm((current) => ({ ...current, authorizationId: event.target.value }))} className={inputClass}><option value="">Select active mandate</option>{usableAuthorizations.map((authorization) => <option key={authorization.id} value={authorization.id}>{authorizationLabel(authorization)}</option>)}</select></label>
                <label><span className={labelClass}>Support case</span><input value={form.supportCaseReference} onChange={(event) => setForm((current) => ({ ...current, supportCaseReference: event.target.value }))} className={inputClass} placeholder="VDX-…" /></label>
                <label><span className={labelClass}>Product</span><select value={form.productId} disabled={fixedProduct} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} className={inputClass}><option value="">Select product</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.market_product ? formatMarketProduct(product.market_product) : product.name}</option>)}</select></label>
                <label><span className={labelClass}>Delivery point</span><select value={form.deliveryPointId} disabled={fixedDeliveryPoint} onChange={(event) => setForm((current) => ({ ...current, deliveryPointId: event.target.value }))} className={inputClass}><option value="">Select delivery point</option>{activeDeliveryPoints.map((point) => <option key={point.id} value={point.id}>{point.name} · {point.region}</option>)}</select></label>
                <label><span className={labelClass}>Availability window</span><select value={form.availabilityWindow} disabled={Boolean(editing)} onChange={(event) => setForm((current) => ({ ...current, availabilityWindow: event.target.value }))} className={inputClass}>{availabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label><span className={labelClass}>Quantity (MT)</span><input type="number" min="0.01" step="0.01" value={form.quantityMt} onChange={(event) => setForm((current) => ({ ...current, quantityMt: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Price (USD/MT)</span><input type="number" min="0.01" step="0.01" value={form.pricePerMtUsd} onChange={(event) => setForm((current) => ({ ...current, pricePerMtUsd: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Expires</span><input type="datetime-local" value={form.expiresAtLocal} onChange={(event) => setForm((current) => ({ ...current, expiresAtLocal: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Certification scheme</span><input value={form.certificationScheme} onChange={(event) => setForm((current) => ({ ...current, certificationScheme: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Specification standard</span><input value={form.specificationStandard} onChange={(event) => setForm((current) => ({ ...current, specificationStandard: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Carbon intensity (gCO₂e/MJ)</span><input type="number" min="0.01" step="0.01" value={form.carbonIntensity} onChange={(event) => setForm((current) => ({ ...current, carbonIntensity: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Feedstock</span><input value={form.feedstock} onChange={(event) => setForm((current) => ({ ...current, feedstock: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Origin</span><input value={form.origin} onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Reason code</span><input value={form.reasonCode} onChange={(event) => setForm((current) => ({ ...current, reasonCode: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))} className={inputClass} /></label>
              </div>

              {selectedAuthorization && (
                <div className="mt-4 grid gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-100 sm:grid-cols-2 xl:grid-cols-4">
                  <span>Per order: ≤ {Number(selectedAuthorization.max_quantity_mt_per_order).toLocaleString()} MT</span>
                  <span>Open exposure: ≤ {Number(selectedAuthorization.max_total_open_quantity_mt).toLocaleString()} MT</span>
                  <span>TTL: ≤ {selectedAuthorization.max_order_ttl_hours}h</span>
                  <span>Valid until: {formatDate(selectedAuthorization.valid_until)}</span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button onClick={() => void refreshContext()} disabled={contextLoading} className="inline-flex items-center gap-2 rounded-lg border border-verdaxis-border px-3 py-2 text-xs font-bold text-verdaxis-text-muted hover:text-verdaxis-text"><RefreshCw size={14} className={contextLoading ? 'animate-spin' : ''} /> Refresh context</button>
                <button onClick={editing ? reviewEdit : previewCreate} disabled={mutationBusy || !canList} className="inline-flex items-center gap-2 rounded-lg bg-verdaxis px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{mutationBusy ? <Loader2 className="animate-spin" size={16} /> : editing ? <Pencil size={16} /> : <FileCheck2 size={16} />}{editing ? 'Review edit' : 'Preview post-only listing'}</button>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-4">
                <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 font-bold text-verdaxis-text"><ShieldCheck className="text-verdaxis" size={18} /> Active mandates</div>{canManageAuthorizations && <button onClick={() => setShowAuthorizationForm((value) => !value)} className="inline-flex items-center gap-1 rounded-lg border border-verdaxis-border px-2.5 py-1.5 text-xs font-bold text-verdaxis-text-muted hover:text-verdaxis-text"><Plus size={13} /> Record</button>}</div>
                <div className="mt-3 space-y-2">
                  {context.active_authorizations.length === 0 && <p className="text-xs text-verdaxis-text-muted">No active mandate. Live support publication is blocked.</p>}
                  {context.active_authorizations.map((authorization) => (
                    <div key={authorization.id} className="rounded-lg border border-verdaxis-border p-3 text-xs">
                      <div className="flex items-start justify-between gap-2"><div><div className="font-bold text-verdaxis-text">{authorization.support_case_reference || authorization.id.slice(0, 8)}</div><div className="mt-1 text-verdaxis-text-muted">Authorized by {authorization.authorized_contact_name}</div></div><span className={`rounded px-2 py-1 text-[10px] font-bold ${authorization.usable_by_current_admin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'}`}>{authorization.usable_by_current_admin ? 'Usable' : 'Separation required'}</span></div>
                      <div className="mt-2 text-verdaxis-text-muted">Evidence: {authorization.evidence_reference}</div>
                      <div className="mt-1 text-verdaxis-text-muted">Expires: {formatDate(authorization.valid_until)}</div>
                      {canManageAuthorizations && <button onClick={() => void revokeAuthorization(authorization)} disabled={authorizationBusy} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300"><Trash2 size={12} /> Revoke mandate</button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-4">
                <div className="flex items-center gap-2 font-bold text-verdaxis-text"><UserRound className="text-verdaxis" size={18} /> Eligible customer principals</div>
                <div className="mt-3 space-y-2 text-xs">{eligiblePrincipals.map((principal) => <div key={principal.id} className="rounded-lg border border-verdaxis-border p-2"><div className="font-medium text-verdaxis-text">{[principal.first_name, principal.last_name].filter(Boolean).join(' ') || principal.email}</div><div className="text-verdaxis-text-muted">{principal.email}</div></div>)}{eligiblePrincipals.length === 0 && <p className="text-amber-300">No execution-eligible supplier user. Publication is blocked.</p>}</div>
              </div>
            </aside>
          </section>

          {showAuthorizationForm && canManageAuthorizations && (
            <form onSubmit={createAuthorization} className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-5">
              <div className="flex items-center justify-between"><div><h3 className="font-bold text-verdaxis-text">Record a bounded customer mandate</h3><p className="mt-1 text-xs text-verdaxis-text-muted">The evidence reference points to the source record; do not paste correspondence into audit fields.</p></div><button type="button" onClick={() => setShowAuthorizationForm(false)} className="p-2 text-verdaxis-text-muted"><X size={17} /></button></div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label><span className={labelClass}>Authorized contact name</span><input required value={authorizationForm.contactName} onChange={(event) => setAuthorizationForm((current) => ({ ...current, contactName: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Authorized contact email</span><input required type="email" value={authorizationForm.contactEmail} onChange={(event) => setAuthorizationForm((current) => ({ ...current, contactEmail: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Evidence reference</span><input required value={authorizationForm.evidenceReference} onChange={(event) => setAuthorizationForm((current) => ({ ...current, evidenceReference: event.target.value }))} className={inputClass} placeholder="crm://cases/…" /></label>
                <label><span className={labelClass}>Support case</span><input value={authorizationForm.supportCaseReference} onChange={(event) => setAuthorizationForm((current) => ({ ...current, supportCaseReference: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Valid from</span><input required type="datetime-local" value={authorizationForm.validFromLocal} onChange={(event) => setAuthorizationForm((current) => ({ ...current, validFromLocal: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Valid until</span><input required type="datetime-local" value={authorizationForm.validUntilLocal} onChange={(event) => setAuthorizationForm((current) => ({ ...current, validUntilLocal: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Fixed product (optional)</span><select value={authorizationForm.productId} onChange={(event) => setAuthorizationForm((current) => ({ ...current, productId: event.target.value }))} className={inputClass}><option value="">Any approved product</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.market_product ? formatMarketProduct(product.market_product) : product.name}</option>)}</select></label>
                <label><span className={labelClass}>Fixed delivery point (optional)</span><select value={authorizationForm.deliveryPointId} onChange={(event) => setAuthorizationForm((current) => ({ ...current, deliveryPointId: event.target.value }))} className={inputClass}><option value="">Any approved point</option>{activeDeliveryPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label>
                <label><span className={labelClass}>Min price (optional)</span><input type="number" min="0.01" step="0.01" value={authorizationForm.minPrice} onChange={(event) => setAuthorizationForm((current) => ({ ...current, minPrice: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Max price (optional)</span><input type="number" min="0.01" step="0.01" value={authorizationForm.maxPrice} onChange={(event) => setAuthorizationForm((current) => ({ ...current, maxPrice: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Max quantity/order</span><input required type="number" min="0.01" step="0.01" value={authorizationForm.maxQuantity} onChange={(event) => setAuthorizationForm((current) => ({ ...current, maxQuantity: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Max total open quantity</span><input required type="number" min="0.01" step="0.01" value={authorizationForm.maxOpenQuantity} onChange={(event) => setAuthorizationForm((current) => ({ ...current, maxOpenQuantity: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Max order TTL (hours)</span><input required type="number" min="1" max="720" value={authorizationForm.maxTtlHours} onChange={(event) => setAuthorizationForm((current) => ({ ...current, maxTtlHours: event.target.value }))} className={inputClass} /></label>
                <label><span className={labelClass}>Max uses (optional)</span><input type="number" min="1" value={authorizationForm.maxUses} onChange={(event) => setAuthorizationForm((current) => ({ ...current, maxUses: event.target.value }))} className={inputClass} /></label>
              </div>
              <div className="mt-4 flex justify-end"><button disabled={authorizationBusy} className="inline-flex items-center gap-2 rounded-lg bg-verdaxis px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{authorizationBusy ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Record authorization</button></div>
            </form>
          )}

          <section className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-verdaxis-text">Organization listings</h2><p className="mt-1 text-xs text-verdaxis-text-muted">Customer-created and customer-adopted listings remain read-only to support.</p></div><span className="text-xs text-verdaxis-text-muted">{activeOrders.length} active</span></div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-verdaxis-border">
              <table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-verdaxis-border text-left text-[10px] font-bold uppercase tracking-wide text-verdaxis-text-muted"><th className="px-3 py-2">Product</th><th className="px-3 py-2">Delivery</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Remaining</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2">Origin</th><th className="px-3 py-2">Version</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{context.orders.map((item) => <tr key={item.order.id} className="border-b border-verdaxis-border/60 last:border-0"><td className="px-3 py-2 font-medium text-verdaxis-text">{getOrderDisplayName(item.order)}</td><td className="px-3 py-2 text-xs text-verdaxis-text-muted">{item.order.delivery_point_name || item.order.region}</td><td className="px-3 py-2 text-right font-mono text-verdaxis-text">${Number(item.order.price_per_mt_usd).toLocaleString()}</td><td className="px-3 py-2 text-right font-mono text-verdaxis-text">{Number(item.order.remaining_quantity_mt).toLocaleString()} MT</td><td className="px-3 py-2 text-xs text-verdaxis-text-muted">{formatDate(item.order.expires_at)}</td><td className="px-3 py-2">{item.attribution ? <span className="rounded bg-sky-500/15 px-2 py-1 text-[10px] font-bold text-sky-300">Verdaxis assisted</span> : <span className="text-xs text-verdaxis-text-muted">Customer</span>}</td><td className="px-3 py-2 text-xs text-verdaxis-text-muted">{item.attribution ? `v${item.attribution.support_version} · ${item.attribution.management_authority === 'SUPPORT_MANDATE' ? 'support' : 'customer'}` : '—'}</td><td className="px-3 py-2"><div className="flex justify-end gap-2">{item.support_manageable && <><button onClick={() => beginEdit(item)} className="rounded border border-verdaxis-border p-1.5 text-verdaxis-text-muted hover:text-verdaxis" title="Edit"><Pencil size={14} /></button><button onClick={() => void cancelOrder(item)} disabled={mutationBusy} className="rounded border border-red-500/20 p-1.5 text-red-400 hover:bg-red-500/10" title="Cancel remaining quantity"><Trash2 size={14} /></button></>}</div></td></tr>)}</tbody></table>
            </div>
          </section>
        </>
      )}

      {reviewAction && preview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-verdaxis-border bg-verdaxis-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-verdaxis-text">{reviewAction === 'create' ? 'Publish executable post-only listing' : 'Apply post-only listing edit'}</h3><p className="mt-1 text-sm text-verdaxis-text-muted">Preview is informative. The server repeats every check under lock before committing.</p></div><button onClick={() => { setReviewAction(null); setAcknowledged(false); }} className="p-2 text-verdaxis-text-muted"><X size={18} /></button></div>
            <div className="mt-5 grid gap-3 rounded-xl border border-verdaxis-border p-4 text-sm sm:grid-cols-2"><div><span className="text-verdaxis-text-muted">Organization</span><div className="font-bold text-verdaxis-text">{selectedOrganization.name}</div></div><div><span className="text-verdaxis-text-muted">Accountable user</span><div className="font-bold text-verdaxis-text">{eligiblePrincipals.find((principal) => principal.id === form.accountableUserId)?.email || form.accountableUserId}</div></div><div><span className="text-verdaxis-text-muted">Quantity</span><div className="font-mono font-bold text-verdaxis-text">{Number(form.quantityMt).toLocaleString()} MT</div></div><div><span className="text-verdaxis-text-muted">Price</span><div className="font-mono font-bold text-verdaxis-text">${Number(form.pricePerMtUsd).toLocaleString()}/MT</div></div><div><span className="text-verdaxis-text-muted">Expires</span><div className="font-bold text-verdaxis-text">{formatDate(toIso(form.expiresAtLocal))}</div></div><div><span className="text-verdaxis-text-muted">Authorization</span><div className="font-bold text-verdaxis-text">{selectedAuthorization ? authorizationLabel(selectedAuthorization) : form.authorizationId}</div></div></div>
            {preview.warnings.length > 0 && <div className="mt-4 space-y-2">{preview.warnings.map((warning) => <div key={warning} className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle size={15} className="shrink-0" /> {warning}</div>)}</div>}
            {preview.would_cross && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">Publication is blocked because the listing would immediately execute.</div>}
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-verdaxis-border p-4"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1" /><span className="text-sm text-verdaxis-text">I confirm the customer mandate authorizes this executable standing order. Another participant may later accept it and create a trade.</span></label>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => { setReviewAction(null); setAcknowledged(false); }} className="rounded-lg border border-verdaxis-border px-4 py-2 text-sm font-bold text-verdaxis-text-muted">Back</button><button onClick={() => void publishReviewedAction()} disabled={!acknowledged || mutationBusy || preview.would_cross || !preview.valid} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{mutationBusy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}{reviewAction === 'create' ? 'Publish listing' : 'Apply edit'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
