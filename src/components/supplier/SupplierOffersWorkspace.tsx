import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNamespace } from '../../hooks/useNamespace';
import { useDashboardContentReady } from '../../hooks/useDashboardContentReady';
import { ApiError, api } from '../../services/api';
import { SUPPLIER_OFFERS_CHANGED_EVENT } from '../../services/fameSupplierOffer';
import type { SupplierOffer } from '../../types/fameSupplierOffer';
import { ConfirmModal } from '../ui/ConfirmModal';
import { VerdaxisSelect } from '../ui/VerdaxisSelect';
import { SupplierOfferDetails } from './SupplierOfferDetails';
import i18n from '../../i18n';

const PAGE_SIZE = 20;
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

interface SupplierOffersWorkspaceProps {
    mine?: boolean;
    onRequestQuote: (offer: SupplierOffer) => void;
    onEdit: (offer: SupplierOffer) => void;
    onPostSupply: () => void;
}

/** Indicative supply shares Marketplace presentation, but never enters the orderbook. */
export function SupplierOffersWorkspace({ mine = false, onRequestQuote, onEdit, onPostSupply }: SupplierOffersWorkspaceProps) {
    const { t, ready } = useNamespace('trading');
    const { user } = useAuth();
    const locale = i18n.resolvedLanguage || 'en';
    const [items, setItems] = useState<SupplierOffer[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [sort, setSort] = useState<'newest' | 'price_asc' | 'quantity_desc'>('newest');
    const [loading, setLoading] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [withdrawal, setWithdrawal] = useState<SupplierOffer | null>(null);
    const [pending, setPending] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [now, setNow] = useState(Date.now());
    const mutationLock = useRef(false);
    const reload = useCallback(() => setRefresh((value) => value + 1), []);
    const copy = (key: string, values?: Record<string, unknown>) => t(`marketplace.supplierOffers.${key}`, values);

    useDashboardContentReady('MARKETPLACE', ready && loaded && !loading && !error);

    useEffect(() => {
        window.addEventListener(SUPPLIER_OFFERS_CHANGED_EVENT, reload);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.removeEventListener(SUPPLIER_OFFERS_CHANGED_EVENT, reload);
            window.clearInterval(timer);
        };
    }, [reload]);

    useEffect(() => {
        setPage(0);
        setItems([]);
        setTotal(0);
        setLoaded(false);
        setExpanded(null);
        setWithdrawal(null);
    }, [mine, user?.id, user?.organization_id]);

    useEffect(() => {
        let current = true;
        setLoading(true);
        setLoaded(false);
        setError(null);
        api.catalog.products().then(async (products) => {
            const product = products.find((item) => item.market_product === 'UCOME_B100' && item.is_active);
            if (!product) throw new Error('catalog');
            const params = { product_id: product.id, skip: page * PAGE_SIZE, limit: PAGE_SIZE, sort_by: sort };
            const result = await (mine ? api.supplierOffers.my(params) : api.supplierOffers.list(params));
            if (!current) return;
            const lastPage = Math.max(0, Math.ceil(result.total / PAGE_SIZE) - 1);
            if (page > lastPage) {
                setPage(lastPage);
                return;
            }
            setItems(result.items);
            setTotal(result.total);
            setLoaded(true);
        }).catch(() => {
            if (current) setError('loadError');
        }).finally(() => {
            if (current) setLoading(false);
        });
        return () => { current = false; };
    }, [mine, page, sort, refresh, user?.id, user?.organization_id]);

    const withdraw = async () => {
        if (!withdrawal || mutationLock.current) return;
        mutationLock.current = true;
        setPending(true);
        setError(null);
        try {
            await api.supplierOffers.withdraw(withdrawal.id, { expected_revision: withdrawal.revision });
            setWithdrawal(null);
            // The API broadcasts the successful write to all mounted listings.
        } catch (failure) {
            setError(failure instanceof ApiError && failure.status === 409 ? 'revisionConflict' : 'saveError');
            setWithdrawal(null);
        } finally {
            mutationLock.current = false;
            setPending(false);
        }
    };

    if (!ready) return null;

    return <section className="space-y-3" aria-label={copy(mine ? 'myTitle' : 'title')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-3xl text-xs text-slate-500 dark:text-slate-400">{copy('notice')}</p>
            <div className="flex items-center gap-2">
                <VerdaxisSelect ariaLabel={copy('sortLabel')} value={sort} onChange={(value) => { setSort(value as typeof sort); setPage(0); }} options={[
                    { value: 'newest', label: copy('sortNewest') },
                    { value: 'price_asc', label: copy('sortPrice') },
                    { value: 'quantity_desc', label: copy('sortQuantity') },
                ]} />
                <button type="button" className={buttonClass} disabled={loading || pending} onClick={reload}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{t('marketplace.btn.refresh')}</button>
            </div>
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{copy(error)}</div>}
        {loading && !loaded ? <div role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 size={20} className="animate-spin" />{copy('loading')}</div>
            : !loaded ? null : items.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <ClipboardList size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">{copy(mine ? 'myEmptyTitle' : 'emptyTitle')}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">{copy(mine ? 'myEmptyBody' : 'emptyBody')}</p>
                {user?.role === 'SUPPLIER' && <button type="button" onClick={onPostSupply} className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">{copy('postSupply')}</button>}
            </div> : <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
                <table className="w-full min-w-[850px] border-collapse text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800"><tr>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('marketplace.col.fuel')}</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{copy('delivery')}</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{copy('quantity')}</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{copy('price')}</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('marketplace.col.expiry')}</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('marketplace.col.status')}</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('marketplace.col.action')}</th>
                    </tr></thead>
                    <tbody>{items.map((offer) => {
                        const expired = new Date(offer.expiresAt).getTime() <= now;
                        const active = offer.status === 'OPEN' && !expired;
                        const state = offer.status === 'OPEN' && expired ? 'EXPIRED' : offer.status;
                        return <React.Fragment key={offer.id}>
                            <tr className="border-t border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                                <td className="px-3 py-3"><span className="font-semibold text-slate-800 dark:text-slate-100">UCOME B100</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{copy('indicative')}</span></td>
                                <td className="px-3 py-3 text-slate-600 dark:text-slate-300"><span>{offer.deliveryPointName || 'Singapore'} · {offer.deliveryBasis.replace('_', ' ')}</span><span className="mt-1 block text-xs">{offer.deliveryStart} → {offer.deliveryEnd}</span></td>
                                <td className="px-3 py-3 text-right font-medium text-slate-800 dark:text-slate-100">{offer.quantityMt.toLocaleString(locale)} MT<span className="mt-1 block text-xs font-normal text-slate-500">{copy('minimum', { quantity: offer.minFillMt.toLocaleString(locale) })}</span></td>
                                <td className="px-3 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">${offer.pricePerMtUsd.toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
                                <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{new Date(offer.expiresAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                <td className="px-3 py-3"><span className={`rounded px-2 py-1 text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{copy(`status.${state}`)}</span><span className="mt-2 block text-xs text-slate-500">{copy('revision', { revision: offer.revision })}</span></td>
                                <td className="px-3 py-3"><div className="flex flex-wrap justify-end gap-2">
                                    <button type="button" className={buttonClass} aria-expanded={expanded === offer.id} onClick={() => setExpanded((current) => current === offer.id ? null : offer.id)}><ChevronDown size={14} />{copy('details')}</button>
                                    {!mine && active && offer.canRequestQuote && user?.role === 'BUYER' && <button type="button" className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500" onClick={() => onRequestQuote(offer)}>{copy('requestQuote')}</button>}
                                    {mine && offer.canEdit && <button type="button" className={buttonClass} disabled={pending} onClick={() => onEdit(offer)}>{copy('revise')}</button>}
                                    {mine && offer.canWithdraw && <button type="button" className={buttonClass} disabled={pending} onClick={() => setWithdrawal(offer)}>{copy('withdraw')}</button>}
                                </div></td>
                            </tr>
                            {expanded === offer.id && <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"><td colSpan={7} className="p-5"><SupplierOfferDetails offer={offer} /></td></tr>}
                        </React.Fragment>;
                    })}</tbody>
                </table>
            </div>}
        {loaded && total > PAGE_SIZE && <div className="flex items-center justify-end gap-3 text-sm text-slate-500">
            <button type="button" className={buttonClass} disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>{copy('previous')}</button>
            <span>{copy('page', { page: page + 1, pages: Math.ceil(total / PAGE_SIZE) })}</span>
            <button type="button" className={buttonClass} disabled={(page + 1) * PAGE_SIZE >= total || loading} onClick={() => setPage((value) => value + 1)}>{copy('next')}</button>
        </div>}
        <ConfirmModal isOpen={Boolean(withdrawal)} onClose={() => { if (!pending) setWithdrawal(null); }} onConfirm={() => void withdraw()} isLoading={pending} title={copy('withdraw')} message={copy('withdrawConfirm')} confirmText={copy('withdraw')} variant="warning" />
    </section>;
}
