import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Building2,
  FileCheck2,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Send,
} from 'lucide-react';

import { api } from '../../../services/api';
import type { DeliveryPoint, Product } from '../../../types';
import type {
  AssistedListing,
  AssistedOrderTerms,
  MarketSupportCapability,
  SupportAuthorization,
  SupportContext,
  SupportOrganization,
} from '../../../types/marketSupport';
import { formatAvailabilityWindow, getAvailabilityWindowOptions } from '../../../utils/availabilityWindow';


const fieldClass = 'w-full h-10 rounded border border-verdaxis-border bg-verdaxis-bg px-3 text-sm text-verdaxis-text outline-none focus:border-verdaxis';
const labelClass = 'block mb-1 text-xs font-semibold text-verdaxis-text-muted';

const dateTimeValue = (hoursAhead: number) => {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const randomKey = () => crypto.randomUUID();

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const fmtDate = (value: string | null) => value
  ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

const statusClass = (status: string) => {
  if (status === 'ACTIVE' || status === 'OPEN') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  if (status === 'CONSUMED' || status === 'PARTIALLY_FILLED') return 'border-sky-500/30 bg-sky-500/10 text-sky-400';
  return 'border-verdaxis-border bg-verdaxis-border/20 text-verdaxis-text-muted';
};

interface FormState {
  accountableUserId: string;
  productId: string;
  deliveryPointId: string;
  availabilityWindow: string;
  quantity: string;
  price: string;
  authorizationExpiresAt: string;
  orderExpiresAt: string;
  certificationScheme: string;
  specificationStandard: string;
  carbonIntensity: string;
  carbonIntensityMethod: string;
  feedstock: string;
  origin: string;
  msdsAvailable: boolean;
  anonymous: boolean;
  evidenceReference: string;
  evidenceText: string;
  consentVersion: string;
  consentReference: string;
  supportCaseReference: string;
}

const initialForm = (): FormState => ({
  accountableUserId: '',
  productId: '',
  deliveryPointId: '',
  availabilityWindow: 'SPOT',
  quantity: '',
  price: '',
  authorizationExpiresAt: dateTimeValue(24),
  orderExpiresAt: dateTimeValue(72),
  certificationScheme: 'ISCC EU',
  specificationStandard: '',
  carbonIntensity: '',
  carbonIntensityMethod: 'Supplier declaration',
  feedstock: '',
  origin: '',
  msdsAvailable: false,
  anonymous: true,
  evidenceReference: '',
  evidenceText: '',
  consentVersion: 'v1',
  consentReference: '',
  supportCaseReference: '',
});

type PendingAction =
  | { kind: 'publish'; authorization: SupportAuthorization }
  | { kind: 'revoke'; authorization: SupportAuthorization }
  | { kind: 'cancel'; listing: AssistedListing };

const AuthorizationForm: React.FC<{
  context: SupportContext;
  products: Product[];
  deliveryPoints: DeliveryPoint[];
  onCreated: () => Promise<void>;
  onClose: () => void;
}> = ({ context, products, deliveryPoints, onCreated, onClose }) => {
  const [form, setForm] = useState<FormState>(() => initialForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const windows = useMemo(() => getAvailabilityWindowOptions(), []);

  useEffect(() => {
    setForm(current => ({
      ...current,
      accountableUserId: current.accountableUserId || context.eligible_principals[0]?.id || '',
      productId: current.productId || products[0]?.id || '',
      deliveryPointId: current.deliveryPointId || deliveryPoints[0]?.id || '',
    }));
  }, [context.eligible_principals, deliveryPoints, products]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const evidenceDigest = await sha256(form.evidenceText.trim());
      const order: AssistedOrderTerms = {
        side: 'ASK',
        product_id: form.productId,
        delivery_point_id: form.deliveryPointId,
        availability_window: form.availabilityWindow,
        quantity_mt: Number(form.quantity),
        price_per_mt_usd: Number(form.price),
        expires_at: new Date(form.orderExpiresAt).toISOString(),
        is_anonymous: form.anonymous,
        certifications: [form.certificationScheme],
        certification_declared: true,
        certification_scheme: form.certificationScheme,
        specification_standard: form.specificationStandard.trim(),
        msds_available: form.msdsAvailable,
        carbon_intensity_gco2_mj: Number(form.carbonIntensity),
        carbon_intensity_method: form.carbonIntensityMethod.trim() || null,
        feedstock: form.feedstock.trim(),
        origin: form.origin.trim(),
        off_spec: false,
        off_spec_notes: null,
      };
      await api.marketSupport.createAuthorization(
        context.organization.id,
        {
          accountable_user_id: form.accountableUserId,
          order,
          authorization_expires_at: new Date(form.authorizationExpiresAt).toISOString(),
          evidence_reference: form.evidenceReference.trim(),
          evidence_sha256: evidenceDigest,
          commercial_consent_version: form.consentVersion.trim(),
          commercial_consent_reference: form.consentReference.trim(),
          support_case_reference: form.supportCaseReference.trim() || null,
        },
        randomKey(),
      );
      await onCreated();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not record authorization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-y border-verdaxis-border bg-verdaxis-surface/40 py-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-verdaxis-text">Record exact customer authorization</h3>
          <p className="mt-1 text-xs text-verdaxis-text-muted">This authorization can publish one ASK with these exact terms.</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-verdaxis-text-muted hover:text-verdaxis-text">Close</button>
      </div>

      {error && <div className="mb-4 flex items-center gap-2 border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"><AlertTriangle size={15} />{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label><span className={labelClass}>Accountable supplier</span><select required className={fieldClass} value={form.accountableUserId} onChange={e => set('accountableUserId', e.target.value)}>{context.eligible_principals.map(user => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
        <label><span className={labelClass}>Fuel</span><select required className={fieldClass} value={form.productId} onChange={e => set('productId', e.target.value)}>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label><span className={labelClass}>Port</span><select required className={fieldClass} value={form.deliveryPointId} onChange={e => set('deliveryPointId', e.target.value)}>{deliveryPoints.map(point => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label>
        <label><span className={labelClass}>Window</span><select required className={fieldClass} value={form.availabilityWindow} onChange={e => set('availabilityWindow', e.target.value)}>{windows.map(window => <option key={window.value} value={window.value}>{window.label}</option>)}</select></label>
        <label><span className={labelClass}>Quantity (MT)</span><input required min="0.01" step="0.01" type="number" className={fieldClass} value={form.quantity} onChange={e => set('quantity', e.target.value)} /></label>
        <label><span className={labelClass}>Price (USD/MT)</span><input required min="0.01" step="0.01" type="number" className={fieldClass} value={form.price} onChange={e => set('price', e.target.value)} /></label>
        <label><span className={labelClass}>Authorization deadline</span><input required type="datetime-local" className={fieldClass} value={form.authorizationExpiresAt} onChange={e => set('authorizationExpiresAt', e.target.value)} /></label>
        <label><span className={labelClass}>Listing expiry</span><input required type="datetime-local" className={fieldClass} value={form.orderExpiresAt} onChange={e => set('orderExpiresAt', e.target.value)} /></label>
        <label><span className={labelClass}>Certification</span><select className={fieldClass} value={form.certificationScheme} onChange={e => set('certificationScheme', e.target.value)}><option>ISCC EU</option><option>RSB</option><option>REDcert EU</option></select></label>
        <label><span className={labelClass}>Specification standard</span><input required className={fieldClass} value={form.specificationStandard} onChange={e => set('specificationStandard', e.target.value)} /></label>
        <label><span className={labelClass}>Carbon intensity (gCO2e/MJ)</span><input required min="0" step="0.01" type="number" className={fieldClass} value={form.carbonIntensity} onChange={e => set('carbonIntensity', e.target.value)} /></label>
        <label><span className={labelClass}>CI method</span><input className={fieldClass} value={form.carbonIntensityMethod} onChange={e => set('carbonIntensityMethod', e.target.value)} /></label>
        <label><span className={labelClass}>Feedstock</span><input required className={fieldClass} value={form.feedstock} onChange={e => set('feedstock', e.target.value)} /></label>
        <label><span className={labelClass}>Origin</span><input required className={fieldClass} value={form.origin} onChange={e => set('origin', e.target.value)} /></label>
        <label><span className={labelClass}>Evidence reference</span><input required className={fieldClass} placeholder="Email thread, CRM, or case reference" value={form.evidenceReference} onChange={e => set('evidenceReference', e.target.value)} /></label>
        <label><span className={labelClass}>Support case</span><input className={fieldClass} value={form.supportCaseReference} onChange={e => set('supportCaseReference', e.target.value)} /></label>
        <label><span className={labelClass}>Consent version</span><input required className={fieldClass} value={form.consentVersion} onChange={e => set('consentVersion', e.target.value)} /></label>
        <label className="xl:col-span-2"><span className={labelClass}>Consent wording reference</span><input required className={fieldClass} placeholder="Approved wording or signed mandate reference" value={form.consentReference} onChange={e => set('consentReference', e.target.value)} /></label>
        <label className="md:col-span-2 xl:col-span-4"><span className={labelClass}>Evidence text used to compute the audit digest</span><textarea required rows={3} className="w-full rounded border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-sm text-verdaxis-text outline-none focus:border-verdaxis" value={form.evidenceText} onChange={e => set('evidenceText', e.target.value)} /><span className="mt-1 block text-xs text-verdaxis-text-muted">Only its SHA-256 digest is sent to Verdaxis.</span></label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-verdaxis-border/60 pt-4">
        <label className="flex items-center gap-2 text-sm text-verdaxis-text"><input type="checkbox" checked={form.msdsAvailable} onChange={e => set('msdsAvailable', e.target.checked)} />MSDS available</label>
        <label className="flex items-center gap-2 text-sm text-verdaxis-text"><input type="checkbox" checked={form.anonymous} onChange={e => set('anonymous', e.target.checked)} />Anonymous public listing</label>
        <button disabled={submitting || context.eligible_principals.length === 0} className="ml-auto flex h-10 items-center gap-2 rounded bg-verdaxis px-4 text-sm font-semibold text-white hover:bg-verdaxis/90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <FileCheck2 size={15} />}Record authorization
        </button>
      </div>
    </form>
  );
};

export const MarketSupportWorkspace: React.FC = () => {
  const [capabilities, setCapabilities] = useState<MarketSupportCapability[]>([]);
  const [organizations, setOrganizations] = useState<SupportOrganization[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [context, setContext] = useState<SupportContext | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'authorizations' | 'listings'>('authorizations');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [error, setError] = useState('');

  const loadContext = useCallback(async (organizationId: string) => {
    if (!organizationId) return;
    setError('');
    try {
      setContext(await api.marketSupport.context(organizationId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load organization workspace');
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.marketSupport.capabilities(),
      api.marketSupport.organizations(),
      api.catalog.products(),
      api.catalog.deliveryPoints(),
    ]).then(([caps, orgPage, productRows, pointRows]) => {
      if (!active) return;
      setCapabilities(caps);
      setOrganizations(orgPage.items);
      setProducts(productRows.filter(product => product.is_active && product.market_product));
      setDeliveryPoints(pointRows.filter(point => point.is_active));
    }).catch(caught => {
      if (active) setError(caught instanceof Error ? caught.message : 'Market Support is unavailable');
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.marketSupport.organizations(query)
        .then(page => setOrganizations(page.items))
        .catch(caught => setError(caught instanceof Error ? caught.message : 'Organization search failed'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => { if (selectedId) void loadContext(selectedId); }, [loadContext, selectedId]);

  const canAuthorize = capabilities.includes('MARKET_SUPPORT_AUTHORIZATIONS');
  const canList = capabilities.includes('MARKET_SUPPORT_LISTINGS');

  const publish = async (authorization: SupportAuthorization) => {
    setWorkingId(authorization.id);
    setError('');
    try {
      await api.marketSupport.publishListing(authorization.organization_id, authorization.id, randomKey());
      await loadContext(authorization.organization_id);
      setTab('listings');
      setPendingAction(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not publish listing';
      setError(message);
      setActionError(message);
    } finally { setWorkingId(''); }
  };

  const revoke = async (authorization: SupportAuthorization) => {
    setWorkingId(authorization.id);
    try {
      await api.marketSupport.revokeAuthorization(authorization.organization_id, authorization.id, actionReason.trim());
      await loadContext(authorization.organization_id);
      setPendingAction(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not revoke authorization';
      setError(message);
      setActionError(message);
    }
    finally { setWorkingId(''); }
  };

  const cancel = async (listing: AssistedListing) => {
    setWorkingId(listing.order.id);
    try {
      await api.marketSupport.cancelListing(selectedId, listing, actionReason.trim());
      await loadContext(selectedId);
      setPendingAction(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not cancel listing';
      setError(message);
      setActionError(message);
    }
    finally { setWorkingId(''); }
  };

  if (loading) return <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="animate-spin text-verdaxis" /></div>;

  const executePendingAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === 'publish') await publish(pendingAction.authorization);
    if (pendingAction.kind === 'revoke') await revoke(pendingAction.authorization);
    if (pendingAction.kind === 'cancel') await cancel(pendingAction.listing);
  };

  const requestAction = (action: PendingAction) => {
    setActionReason('');
    setActionError('');
    setPendingAction(action);
  };

  return (
    <>
    <div className="grid min-h-[620px] grid-cols-1 border border-verdaxis-border lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-verdaxis-border bg-verdaxis-surface/30 lg:border-b-0 lg:border-r">
        <div className="border-b border-verdaxis-border p-4">
          <div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-verdaxis-text-muted" /><input className={`${fieldClass} pl-9`} placeholder="Search organizations" value={query} onChange={event => setQuery(event.target.value)} /></div>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {organizations.map(organization => (
            <button key={organization.id} onClick={() => { setSelectedId(organization.id); setShowForm(false); }} className={`w-full border-b border-verdaxis-border/60 px-4 py-3 text-left transition-colors ${selectedId === organization.id ? 'bg-verdaxis/10' : 'hover:bg-verdaxis-border/10'}`}>
              <span className="block text-sm font-semibold text-verdaxis-text">{organization.name}</span>
              <span className="mt-0.5 block truncate text-xs text-verdaxis-text-muted">{organization.domain || organization.type}</span>
            </button>
          ))}
          {organizations.length === 0 && <p className="p-5 text-center text-sm text-verdaxis-text-muted">No approved real organizations found.</p>}
        </div>
      </aside>

      <section className="min-w-0">
        {!context ? (
          <div className="flex min-h-[560px] flex-col items-center justify-center text-center"><Building2 size={30} className="mb-3 text-verdaxis-text-muted" /><p className="text-sm font-semibold text-verdaxis-text">Select an organization</p><p className="mt-1 text-xs text-verdaxis-text-muted">The selected customer remains the economic party.</p></div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-4 border-b border-verdaxis-border px-5 py-4">
              <div><h2 className="text-base font-semibold text-verdaxis-text">{context.organization.name}</h2><p className="text-xs text-verdaxis-text-muted">{context.organization.domain || context.organization.type} · {context.eligible_principals.length} eligible supplier principal{context.eligible_principals.length === 1 ? '' : 's'}</p></div>
              {canAuthorize && <button onClick={() => setShowForm(value => !value)} className="ml-auto flex h-9 items-center gap-2 rounded border border-verdaxis px-3 text-sm font-semibold text-verdaxis hover:bg-verdaxis/10"><Plus size={15} />Authorization</button>}
            </header>

            {error && <div className="m-4 flex items-center gap-2 border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"><AlertTriangle size={15} />{error}</div>}
            {showForm && canAuthorize && <div className="px-5"><AuthorizationForm context={context} products={products} deliveryPoints={deliveryPoints} onCreated={() => loadContext(context.organization.id)} onClose={() => setShowForm(false)} /></div>}

            <div className="flex gap-1 border-b border-verdaxis-border px-5 pt-2">
              <button onClick={() => setTab('authorizations')} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'authorizations' ? 'border-verdaxis text-verdaxis' : 'border-transparent text-verdaxis-text-muted'}`}><FileCheck2 size={15} />Authorizations <span className="text-xs">{context.authorizations.length}</span></button>
              <button onClick={() => setTab('listings')} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'listings' ? 'border-verdaxis text-verdaxis' : 'border-transparent text-verdaxis-text-muted'}`}><ListChecks size={15} />Listings <span className="text-xs">{context.listings.length}</span></button>
            </div>

            <div className="max-h-[470px] overflow-auto">
              {tab === 'authorizations' && (
                context.authorizations.length === 0 ? <p className="p-8 text-center text-sm text-verdaxis-text-muted">No authorization has been recorded for this organization.</p> :
                <table className="w-full min-w-[920px] text-sm"><thead className="sticky top-0 bg-verdaxis-bg text-left text-xs uppercase text-verdaxis-text-muted"><tr><th className="px-5 py-3">Terms</th><th className="px-4 py-3">Principal</th><th className="px-4 py-3">Validity</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Status</th><th className="px-5 py-3" /></tr></thead><tbody>{context.authorizations.map(authorization => {
                  const product = products.find(item => item.id === authorization.order.product_id)?.name || authorization.order.product_id;
                  const port = deliveryPoints.find(item => item.id === authorization.order.delivery_point_id)?.name || authorization.order.delivery_point_id;
                  const principal = context.eligible_principals.find(item => item.id === authorization.accountable_user_id);
                  return <tr key={authorization.id} className="border-t border-verdaxis-border/60"><td className="px-5 py-4"><div className="font-semibold text-verdaxis-text">{product} · {port}</div><div className="mt-1 text-xs text-verdaxis-text-muted">{authorization.order.quantity_mt} MT @ ${authorization.order.price_per_mt_usd}/MT · {formatAvailabilityWindow(authorization.order.availability_window)}</div></td><td className="px-4 py-4 text-xs text-verdaxis-text-muted">{principal?.name || authorization.accountable_user_id}</td><td className="px-4 py-4 text-xs text-verdaxis-text-muted"><div>Use by {fmtDate(authorization.authorization_expires_at)}</div><div>Order to {fmtDate(authorization.order_expires_at)}</div></td><td className="max-w-[220px] px-4 py-4 text-xs text-verdaxis-text-muted"><div className="truncate" title={authorization.evidence_reference}>{authorization.evidence_reference}</div><div className="mt-1 font-mono opacity-70">{authorization.terms_digest.slice(0, 12)}…</div></td><td className="px-4 py-4"><span className={`rounded border px-2 py-1 text-xs font-semibold ${statusClass(authorization.status)}`}>{authorization.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2">{authorization.status === 'ACTIVE' && canList && <button disabled={workingId === authorization.id} onClick={() => requestAction({ kind: 'publish', authorization })} className="flex items-center gap-1.5 rounded bg-verdaxis px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Send size={13} />Publish</button>}{authorization.status !== 'REVOKED' && canAuthorize && <button disabled={workingId === authorization.id} onClick={() => requestAction({ kind: 'revoke', authorization })} className="flex items-center gap-1.5 rounded border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"><Ban size={13} />Revoke</button>}</div></td></tr>;
                })}</tbody></table>
              )}

              {tab === 'listings' && (
                context.listings.length === 0 ? <p className="p-8 text-center text-sm text-verdaxis-text-muted">No assisted listings for this organization.</p> :
                <table className="w-full min-w-[820px] text-sm"><thead className="sticky top-0 bg-verdaxis-bg text-left text-xs uppercase text-verdaxis-text-muted"><tr><th className="px-5 py-3">Listing</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Status</th><th className="px-5 py-3" /></tr></thead><tbody>{context.listings.map(listing => <tr key={listing.order.id} className="border-t border-verdaxis-border/60"><td className="px-5 py-4"><div className="font-semibold text-verdaxis-text">{listing.order.product_name} · {listing.order.delivery_point_name}</div><div className="mt-1 text-xs text-verdaxis-text-muted">{formatAvailabilityWindow(listing.order.availability_window)} · v{listing.version}</div></td><td className="px-4 py-4 text-verdaxis-text">{listing.order.remaining_quantity_mt} / {listing.order.quantity_mt} MT</td><td className="px-4 py-4 font-mono text-verdaxis-text">${listing.order.price_per_mt_usd}/MT</td><td className="px-4 py-4 text-xs text-verdaxis-text-muted">{fmtDate(listing.order.expires_at)}</td><td className="px-4 py-4"><span className={`rounded border px-2 py-1 text-xs font-semibold ${statusClass(listing.order.status)}`}>{listing.order.status}</span></td><td className="px-5 py-4 text-right">{['OPEN', 'PARTIALLY_FILLED'].includes(listing.order.status) && canList && <button disabled={workingId === listing.order.id} onClick={() => requestAction({ kind: 'cancel', listing })} className="rounded border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50">Cancel</button>}</td></tr>)}</tbody></table>
              )}
            </div>
          </>
        )}
      </section>
    </div>
    {pendingAction && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 p-4" role="presentation">
        <div className="w-full max-w-lg rounded-md border border-verdaxis-border bg-white p-5 shadow-2xl dark:bg-[#16202a]" role="dialog" aria-modal="true" aria-labelledby="market-support-action-title">
          <h3 id="market-support-action-title" className="text-base font-semibold text-verdaxis-text">
            {pendingAction.kind === 'publish' ? 'Publish executable ASK?' : pendingAction.kind === 'revoke' ? 'Revoke authorization?' : 'Cancel assisted listing?'}
          </h3>
          <p className="mt-2 text-sm leading-6 text-verdaxis-text-muted">
            {pendingAction.kind === 'publish'
              ? 'This publishes an executable standing ASK for the customer. It may be partially or fully filled later until it expires, is cancelled, or the authorization is revoked.'
              : 'This action is recorded in the audit trail. Enter the operational reason before continuing.'}
          </p>
          {actionError && <div className="mt-4 flex items-center gap-2 border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"><AlertTriangle size={15} />{actionError}</div>}
          {pendingAction.kind !== 'publish' && (
            <label className="mt-4 block">
              <span className={labelClass}>Audit reason</span>
              <textarea autoFocus rows={3} maxLength={500} value={actionReason} onChange={event => setActionReason(event.target.value)} className="w-full rounded border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-sm text-verdaxis-text outline-none focus:border-verdaxis" />
            </label>
          )}
          <div className="mt-5 flex justify-end gap-2 border-t border-verdaxis-border pt-4">
            <button disabled={Boolean(workingId)} onClick={() => setPendingAction(null)} className="h-9 rounded px-3 text-sm font-semibold text-verdaxis-text-muted hover:bg-verdaxis-border/30 disabled:opacity-50">Back</button>
            <button disabled={Boolean(workingId) || (pendingAction.kind !== 'publish' && actionReason.trim().length < 3)} onClick={() => void executePendingAction()} className={`flex h-9 items-center gap-2 rounded px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${pendingAction.kind === 'publish' ? 'bg-verdaxis hover:bg-verdaxis/90' : 'bg-red-600 hover:bg-red-700'}`}>
              {workingId && <Loader2 size={14} className="animate-spin" />}
              {pendingAction.kind === 'publish' ? 'Acknowledge and publish' : pendingAction.kind === 'revoke' ? 'Revoke authorization' : 'Cancel listing'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
