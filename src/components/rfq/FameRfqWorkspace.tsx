import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, Plus, RefreshCw } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useAuth } from '../../context/AuthContext';
import { useNamespace } from '../../hooks/useNamespace';
import { useDashboardContentReady } from '../../hooks/useDashboardContentReady';
import { api } from '../../services/api';
import { fameRfqErrorKey, isFameQuoteExpired, isFameRfqOpen, quotePricePerGj } from '../../services/fameRfq';
import type { FameQuote, FameQuoteInput, FameRfq, FameRfqCreateInput } from '../../types/fameRfq';
import type { DeliveryPoint, Product } from '../../types';
import i18n from '../../i18n';
import { LoadingScreen } from '../LoadingScreen';
import { ConfirmModal } from '../ui/ConfirmModal';
import { FameQuoteForm, FameRequestForm } from './FameRfqForms';

const PAGE_SIZE = 20;
const panel = 'rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="min-w-0"><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900 dark:text-slate-100">{children}</dd></div>;
}

function formatDate(value: string | null, locale: string): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(t: TFunction, status: string): string {
    const known = ['OPEN', 'QUOTED', 'EXPIRED', 'CANCELLED', 'PENDING', 'WITHDRAWN', 'ACCEPTED', 'DECLINED'];
    return known.includes(status) ? t(`status.${status}`) : t('status.unknown');
}

function ContractDetails({ rfq, t, number }: { rfq: FameRfq; t: TFunction; number: (value: number | null | undefined) => string }) {
    const terms = rfq.contractTerms;
    if (!terms) return <p className="p-5 text-sm text-amber-700 dark:text-amber-300">{t('missingContract')}</p>;
    return <section className={`${panel} p-5`} aria-labelledby="rfq-contract-title">
        <h2 id="rfq-contract-title" className="font-semibold text-slate-900 dark:text-white">{t('contractTitle')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('contractVersion', { version: terms.schema_version })}</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Detail label={t('fields.deliveryBasis')}>{t(`basis.${terms.delivery_basis}`)}</Detail>
            <Detail label={t('fields.namedLocation')}>{terms.named_location}</Detail>
            <Detail label={t('fields.deliveryDates')}>{terms.delivery_start} → {terms.delivery_end}</Detail>
            <Detail label={t('fields.quantity')}>{number(rfq.quantityMt)} MT</Detail>
            <Detail label={t('fields.quantityTolerance')}>{number(terms.quantity_tolerance_pct)}%</Detail>
            <Detail label={t('fields.minFill')}>{number(terms.min_fill_mt)} MT</Detail>
            <Detail label={t('fields.standard')}>{t(`standard.${terms.standard}`)} · {terms.standard_edition}</Detail>
            <Detail label={t('fields.maxCfpp')}>{terms.max_cfpp_c == null ? t('notSupplied') : `${number(terms.max_cfpp_c)} °C`}</Detail>
            <Detail label={t('fields.maxCi')}>{terms.max_ci_gco2e_mj == null ? t('notSupplied') : `${number(terms.max_ci_gco2e_mj)} gCO₂e/MJ`}</Detail>
            <Detail label={t('fields.scheme')}>{t(`scheme.${terms.sustainability_scheme}`)}</Detail>
            <Detail label={t('fields.evidenceDue')}>{t(`evidenceDue.${terms.evidence_due}`)}</Detail>
            <Detail label={t('fields.targetPrice')}>{rfq.targetPricePerMt == null ? t('notSupplied') : `$${number(rfq.targetPricePerMt)}/MT`}</Detail>
        </dl>
        <details className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">{t('commercialTerms')}</summary>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Detail label={t('fields.paymentTerms')}>{terms.payment_terms}</Detail>
                <Detail label={t('fields.inspectionTerms')}>{terms.inspection_terms}</Detail>
                <Detail label={t('fields.titleRiskTerms')}>{terms.title_risk_terms}</Detail>
                <Detail label={t('fields.claimsTerms')}>{terms.claims_terms}</Detail>
                {rfq.notes && <Detail label={t('fields.notes')}>{rfq.notes}</Detail>}
            </dl>
        </details>
    </section>;
}

function OfferDetails({ quote, t, number }: { quote: FameQuote; t: TFunction; number: (value: number | null | undefined) => string }) {
    const terms = quote.offerTerms;
    if (!terms) return <p className="text-sm">{t('missingOffer')}</p>;
    return <dl className="grid gap-4 text-left sm:grid-cols-2 xl:grid-cols-3">
        <Detail label={t('fields.batchReference')}>{terms.batch_reference}</Detail>
        <Detail label={t('fields.producingSite')}>{terms.producing_site}</Detail>
        <Detail label={t('fields.productionOrigin')}>{terms.production_origin}</Detail>
        <Detail label={t('fields.feedstockOrigin')}>{terms.feedstock_origin}</Detail>
        <Detail label={t('fields.shippingLocation')}>{terms.shipping_location}</Detail>
        <Detail label={t('fields.ucoMass')}>{number(terms.uco_mass_pct)}%</Detail>
        <Detail label={t('fields.standard')}>{t(`standard.${terms.standard}`)} · {terms.standard_edition}</Detail>
        <Detail label={t('fields.cfpp')}>{terms.cfpp_c == null ? t('notSupplied') : `${number(terms.cfpp_c)} °C`}</Detail>
        <Detail label={t('fields.lhv')}>{terms.lhv_mj_kg == null ? t('notSupplied') : `${number(terms.lhv_mj_kg)} MJ/kg`}</Detail>
        <Detail label={t('fields.ciMethodology')}>{terms.ci_methodology || t('notSupplied')}</Detail>
        <Detail label={t('fields.availableQuantity')}>{number(terms.available_quantity_mt)} MT</Detail>
        <Detail label={t('fields.scheme')}>{t(`scheme.${terms.sustainability_scheme}`)}</Detail>
        <Detail label={t('fields.certificateReference')}>{terms.certificate_reference}</Detail>
        <Detail label={t('fields.certificateHolder')}>{terms.certificate_holder}</Detail>
        <Detail label={t('fields.certificateValidUntil')}>{terms.certificate_valid_until}</Detail>
        <Detail label={t('fields.documentReferences')}>{terms.document_references.join('\n') || t('notSupplied')}</Detail>
        <Detail label={t('fields.contractMatch')}>{terms.matches_contract_terms ? t('declaredMatch') : t('notSupplied')}</Detail>
        {quote.notes && <Detail label={t('fields.notes')}>{quote.notes}</Detail>}
    </dl>;
}

export function FameRfqWorkspace({ embedded = false }: { embedded?: boolean }) {
    const { t, ready } = useNamespace('rfq');
    const { user } = useAuth();
    const headingId = useId();
    const locale = i18n.resolvedLanguage || 'en';
    const number = (value: number | null | undefined) => value == null || !Number.isFinite(value)
        ? t('notSupplied') : value.toLocaleString(locale, { maximumFractionDigits: 2 });
    const [catalog, setCatalog] = useState<{ product: Product; deliveryPoint: DeliveryPoint } | null>(null);
    const [items, setItems] = useState<FameRfq[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selected, setSelected] = useState<FameRfq | null>(null);
    const [loading, setLoading] = useState(true);
    const [listReady, setListReady] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [quoteForm, setQuoteForm] = useState<FameQuote | 'new' | null>(null);
    const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<'cancel' | FameQuote | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [now, setNow] = useState(Date.now());
    const mutationLock = useRef(false);
    const detailGeneration = useRef(0);

    useDashboardContentReady(embedded ? 'MARKETPLACE' : 'RFQS', ready && !loading && !error);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        let current = true;
        setLoading(true);
        setListReady(false);
        setError(null);
        Promise.all([api.catalog.products(), api.catalog.deliveryPoints()]).then(async ([products, points]) => {
            const product = products.find((entry) => entry.market_product === 'UCOME_B100' && entry.is_active);
            const deliveryPoint = points.find((entry) => entry.is_active && product?.available_delivery_point_ids?.includes(entry.id));
            if (!product || !deliveryPoint) {
                if (current) { setCatalog(null); setItems([]); setTotal(0); setSelectedId(null); setListReady(true); }
                return;
            }
            if (!current) return;
            setCatalog({ product, deliveryPoint });
            const response = await api.rfq.list({ product_id: product.id, skip: page * PAGE_SIZE, limit: PAGE_SIZE });
            if (!current) return;
            setItems(response.items);
            setTotal(response.total);
            setListReady(true);
            setSelectedId((id) => response.items.some((item) => item.id === id) ? id : response.items[0]?.id ?? null);
        }).catch(() => { if (current) setError('loadError'); }).finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [page, refresh, user?.id, user?.organization_id]);

    useEffect(() => {
        const generation = ++detailGeneration.current;
        setSelected(null);
        setQuoteForm(null);
        setExpandedQuote(null);
        if (!selectedId) { setDetailLoading(false); return; }
        setDetailLoading(true);
        api.rfq.get(selectedId).then((response) => {
            if (generation === detailGeneration.current) setSelected(response);
        }).catch(() => {
            if (generation === detailGeneration.current) setError('detailError');
        }).finally(() => {
            if (generation === detailGeneration.current) setDetailLoading(false);
        });
        return () => { detailGeneration.current++; };
    }, [selectedId, refresh]);

    // The lock stops duplicate writes before React commits the disabled controls.
    const mutate = useCallback(async (action: () => Promise<unknown>) => {
        if (mutationLock.current) return;
        mutationLock.current = true;
        setPending(true);
        setError(null);
        try {
            await action();
            setCreateOpen(false);
            setQuoteForm(null);
            setConfirmation(null);
            setRefresh((value) => value + 1);
        } catch (failure) {
            setError(fameRfqErrorKey(failure));
        } finally {
            mutationLock.current = false;
            setPending(false);
        }
    }, []);

    const open = selected ? isFameRfqOpen(selected, now) : false;
    const ownQuote = selected?.quotes.find((quote) => quote.sellerOrgId === user?.organization_id);
    const canQuote = user?.role === 'SUPPLIER' && Boolean(user.organization_id) && open
        && selected?.buyerOrgId !== user.organization_id && Boolean(selected?.contractTerms);
    const canCancel = user?.role === 'BUYER' && selected?.canCancel === true && open;

    if (!ready) return <LoadingScreen />;

    const submitRequest = async (input: FameRfqCreateInput) => mutate(async () => {
        const request = await api.rfq.create(input);
        setPage(0);
        setSelectedId(request.id);
    });
    const submitQuote = async (input: FameQuoteInput) => {
        if (!selected || !canQuote) return;
        await mutate(() => quoteForm && quoteForm !== 'new'
            ? api.rfq.revise(selected.id, quoteForm.id, { ...input, expected_revision: quoteForm.revision }) : api.rfq.quote(selected.id, input));
    };

    const Container = embedded ? 'section' : 'div';
    const Heading = embedded ? 'h2' : 'h1';

    return <Container
        aria-labelledby={embedded ? headingId : undefined}
        className={embedded ? 'space-y-4' : 'mx-auto max-w-[1600px] space-y-5 p-4 pb-10 lg:p-8'}
    >
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{t('lane')}</p>
                <Heading id={headingId} className={`${embedded ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-white`}>{t('title')}</Heading>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{t('description')}</p>
            </div>
            <div className="flex gap-2">
                <button type="button" className={secondaryButton} disabled={loading || pending} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={16} />{t('refresh')}</button>
                {user?.role === 'BUYER' && <button type="button" className={primaryButton} disabled={!catalog || !listReady || loading || pending} onClick={() => { setCreateOpen(true); setError(null); }}><Plus size={17} />{t('create')}</button>}
            </div>
        </header>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{t('pilotNotice')}</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('audience')}</p>
        {user?.role === 'ADMIN' && <p className="text-sm text-slate-600 dark:text-slate-400">{t('adminReadOnly')}</p>}
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{t(error)}</div>}

        {createOpen && catalog ? <section className={`${panel} p-5`}>
            <button type="button" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" disabled={pending} onClick={() => setCreateOpen(false)}><ArrowLeft size={16} />{t('back')}</button>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">{t('create')}</h2>
            <FameRequestForm productId={catalog.product.id} deliveryPointId={catalog.deliveryPoint.id} onSubmit={submitRequest} onCancel={() => setCreateOpen(false)} pending={pending} />
        </section> : loading ? <LoadingScreen /> : !listReady ? null : !catalog ? <div className={`${panel} p-8 text-sm text-slate-600 dark:text-slate-400`}>{t('catalogUnavailable')}</div>
            : <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                <section className={`${panel} overflow-hidden`} aria-labelledby="rfq-list-title">
                    <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700"><h2 id="rfq-list-title" className="font-semibold text-slate-900 dark:text-white">{t('requests')}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('requestCount', { count: total })}</p></div>
                    {items.length === 0 ? <div className="space-y-3 p-6 text-sm text-slate-500 dark:text-slate-400"><FileText size={24} /><p>{t('empty')}</p></div>
                        : <ul className="divide-y divide-slate-200 dark:divide-slate-700">{items.map((rfq) => <li key={rfq.id}>
                            <button type="button" disabled={pending} aria-pressed={selectedId === rfq.id} className={`w-full p-4 text-left transition-colors disabled:opacity-50 ${selectedId === rfq.id ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`} onClick={() => { setSelectedId(rfq.id); setError(null); }}>
                                <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-slate-900 dark:text-white">{number(rfq.quantityMt)} MT</span><span className="text-xs text-slate-500 dark:text-slate-400">{statusLabel(t, isFameRfqOpen(rfq, now) ? rfq.status : ['OPEN', 'QUOTED'].includes(rfq.status) ? 'EXPIRED' : rfq.status)}</span></div>
                                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{rfq.isAnonymous && rfq.buyerOrgId !== user?.organization_id ? t('privateBuyer') : rfq.buyerOrgName || t('privateBuyer')}</p>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('quoteCount', { count: rfq.quoteCount })} · {rfq.id.slice(0, 8)}</p>
                            </button>
                        </li>)}</ul>}
                    {total > PAGE_SIZE && <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
                        <button type="button" aria-label={t('previous')} className={secondaryButton} disabled={page === 0 || pending} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{t('page', { page: page + 1, pages: Math.ceil(total / PAGE_SIZE) })}</span>
                        <button type="button" aria-label={t('next')} className={secondaryButton} disabled={(page + 1) * PAGE_SIZE >= total || pending} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button>
                    </div>}
                </section>
                <div className="min-w-0 space-y-5">
                    {detailLoading ? <LoadingScreen /> : selected ? <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('requestDetail', { id: selected.id.slice(0, 8) })}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('requestExpiry', { date: formatDate(selected.expiresAt, locale) })}</p></div>
                            {canCancel && <button type="button" className={secondaryButton} disabled={pending} onClick={() => setConfirmation('cancel')}>{t('cancelRequest')}</button>}
                        </div>
                        <ContractDetails rfq={selected} t={t} number={number} />
                        <section className={`${panel} min-w-0 overflow-hidden`} aria-labelledby="rfq-quotes-title">
                            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                                <div><h2 id="rfq-quotes-title" className="font-semibold text-slate-900 dark:text-white">{t('quotesTitle')}</h2><p className="mt-1 max-w-xl text-xs text-slate-500 dark:text-slate-400">{t('comparisonNote')}</p></div>
                                {canQuote && !quoteForm && <button type="button" className={primaryButton} disabled={pending} onClick={() => setQuoteForm(ownQuote ?? 'new')}>{ownQuote ? t('revise') : t('submitQuote')}</button>}
                            </div>
                            {quoteForm ? <div className="border-t border-slate-200 p-5 dark:border-slate-700"><FameQuoteForm key={quoteForm === 'new' ? 'new' : quoteForm.id} rfq={selected} quote={quoteForm === 'new' ? undefined : quoteForm} onSubmit={submitQuote} onCancel={() => setQuoteForm(null)} pending={pending} /></div>
                                : selected.quotes.length === 0 ? <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">{t('noQuotes')}</p>
                                    : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                                        <caption className="sr-only">{t('quotesTitle')}</caption>
                                        <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><tr>{['supplier', 'price', 'energyPrice', 'ci', 'evidence', 'validity', 'details'].map((key) => <th scope="col" key={key} className="whitespace-nowrap px-4 py-3 font-medium">{t(`columns.${key}`)}</th>)}</tr></thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{selected.quotes.map((quote) => {
                                            const expired = isFameQuoteExpired(quote, now);
                                            const own = user?.role === 'SUPPLIER' && quote.sellerOrgId === user.organization_id;
                                            return <React.Fragment key={quote.id}><tr className="align-top text-slate-700 dark:text-slate-200">
                                                <th scope="row" className="min-w-[130px] px-4 py-4 font-medium">{quote.sellerOrgName || t('supplier')}<span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{t('revision', { revision: quote.revision })}</span></th>
                                                <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">${number(quote.pricePerMtUsd)}</td>
                                                <td className="px-4 py-4 tabular-nums">{quotePricePerGj(quote) == null ? t('notSupplied') : `$${number(quotePricePerGj(quote))}`}</td>
                                                <td className="px-4 py-4 tabular-nums">{number(quote.offerTerms?.ci_gco2e_mj)}</td>
                                                <td className="px-4 py-4"><span className="rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-600">{quote.offerTerms ? t(`evidence.${quote.offerTerms.evidence_status}`) : t('notSupplied')}</span></td>
                                                <td className="min-w-[150px] px-4 py-4 text-xs"><p>{statusLabel(t, quote.status === 'WITHDRAWN' ? 'WITHDRAWN' : expired ? 'EXPIRED' : quote.status)}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{formatDate(quote.expiresAt, locale)}</p></td>
                                                <td className="px-4 py-4"><button type="button" aria-expanded={expandedQuote === quote.id} aria-controls={`offer-${quote.id}`} className="text-sm font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400" onClick={() => setExpandedQuote((id) => id === quote.id ? null : quote.id)}>{t('viewOffer')}</button>{own && quote.status === 'PENDING' && <button type="button" className="mt-3 block text-xs text-slate-500 underline dark:text-slate-400" disabled={pending} onClick={() => setConfirmation(quote)}>{t('withdraw')}</button>}</td>
                                            </tr>{expandedQuote === quote.id && <tr id={`offer-${quote.id}`}><td colSpan={7} className="bg-slate-50 p-5 dark:bg-slate-950/40"><OfferDetails quote={quote} t={t} number={number} /></td></tr>}</React.Fragment>;
                                        })}</tbody>
                                    </table></div>}
                            <p className="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('evidenceNotice')}</p>
                        </section>
                    </> : items.length > 0 && <p className="p-5 text-sm text-slate-500 dark:text-slate-400">{t('chooseRequest')}</p>}
                </div>
            </div>}
        <ConfirmModal isOpen={confirmation !== null} onClose={() => { if (!pending) setConfirmation(null); }} onConfirm={() => {
            if (!selected || !confirmation) return;
            void mutate(() => confirmation === 'cancel' ? api.rfq.cancel(selected.id) : api.rfq.withdraw(selected.id, confirmation.id));
        }} title={t(confirmation === 'cancel' ? 'cancelRequest' : 'withdraw')} message={t(confirmation === 'cancel' ? 'cancelConfirm' : 'withdrawConfirm')} confirmText={t(confirmation === 'cancel' ? 'cancelRequest' : 'withdraw')} isLoading={pending} />
    </Container>;
}
