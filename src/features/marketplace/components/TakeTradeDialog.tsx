import { getBiofuelSpecification } from '../../../utils/biofuelSpecification';
import { formatQuantity, formatUsd } from '../../../utils/numberFormat';
import React from 'react';
import { Loader2, AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { OrderBookOrder, ViewMode, Trade, TradeCreateInput } from '../../../types';
import { KycRequiredNotice } from '../../../components/kyc/KycRequiredNotice';
import { getOrderDisplayName } from '../../../utils/marketProduct';
import type { FameOrderBidTerms } from '../../../types/fameOrder';
import { FameOrderFields } from '../../../components/fame/FameOrderFields';
import { FameOrderTermsDetails } from '../../../components/fame/FameOrderTermsDetails';
import type { LngOrderTerms } from '../../../types/lngOrder';
import { LngOrderFields } from '../../../components/lng/LngOrderFields';
import { LngOrderTermsDetails } from '../../../components/lng/LngOrderTermsDetails';


import type { TFunction } from 'i18next';
import type { MarketplaceRolePresentation } from './Marketplace';

interface TakeTradeDialogProps {
    isHistorySelected: boolean;
    selectedOrder: OrderBookOrder | null;
    tradeState: 'idle' | 'confirming' | 'reviewing' | 'submitting' | 'success' | 'outcome_unknown' | 'error';
    tradeResult: Trade | null;
    t: TFunction;
    locale: string;
    role: ViewMode;
    tradeError: string;
    confirmTrade: () => Promise<void>;
    closeTradeModal: () => void;
    tradeKycBlocked: boolean;
    tradeNeedsRefresh: boolean;
    refreshReview: () => void;
    configBase: MarketplaceRolePresentation;
    tradeQuantity: number;
    setTradeQuantity: (quantity: number) => void;
    tradeTermsForm: React.RefObject<HTMLFormElement | null>;
    tradeLngTermsForm: React.RefObject<HTMLFormElement | null>;
    reviewTrade: () => void;
    initialBuyerTerms: FameOrderBidTerms | undefined;
    initialLngTaker: LngOrderTerms | undefined;
    tradeFameInput: Pick<TradeCreateInput, 'fame_terms' | 'certification_declared' | 'msds_available'> | null;
    tradeLngInput: Pick<TradeCreateInput, 'lng_terms' | 'msds_available'> | null;
    setTradeState: (state: 'confirming') => void;
}

export function TakeTradeDialog({ isHistorySelected, selectedOrder, tradeState, tradeResult, t, locale, role, tradeError, confirmTrade, closeTradeModal, tradeKycBlocked, tradeNeedsRefresh, refreshReview, configBase, tradeQuantity, setTradeQuantity, tradeTermsForm, tradeLngTermsForm, reviewTrade, initialBuyerTerms, initialLngTaker, tradeFameInput, tradeLngInput, setTradeState }: TakeTradeDialogProps) {
    return <>
            {/* ─── Trade Confirmation Modal ─────────────────────────── */}
            {!isHistorySelected && selectedOrder && tradeState !== 'idle' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-h-[90dvh] overflow-y-auto ${selectedOrder.market_product === 'UCOME_B100' || selectedOrder.market_product === 'BIO_LNG' ? 'max-w-3xl' : 'max-w-lg'}`} data-tour="trade-modal">
                        {tradeState === 'success' ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                    {tradeResult?.status === 'PENDING_CONFIRMATION'
                                        ? t('marketplace.modal.tradeInitiated')
                                        : t('marketplace.modal.tradeRecorded')}
                                </h3>
                                {tradeResult && (
                                    <div className="w-full mt-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('marketplace.modal.product')}</span>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{tradeResult.product_name || (typeof tradeResult.market_product === 'string' ? tradeResult.market_product : tradeResult.fuel_type)}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('marketplace.filter.port')}</span>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{tradeResult.delivery_point_name || tradeResult.region}</div>
                                            </div>
                                            <div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('marketplace.modal.quantity')}</span>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{formatQuantity(tradeResult.quantity_mt, locale)} MT</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('marketplace.modal.price')}</span>
                                                <div className="font-bold text-emerald-600 dark:text-emerald-400">${formatUsd(tradeResult.price_per_mt_usd)}/MT</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs text-slate-400">{t('marketplace.modal.total')}</span>
                                            <span className="text-base font-bold text-slate-900 dark:text-white">
                                                ${(tradeResult.quantity_mt * tradeResult.price_per_mt_usd).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                            {t('marketplace.modal.status')}: {tradeResult.status.replaceAll('_', ' ')}
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                                    {tradeResult?.status === 'PENDING_CONFIRMATION'
                                        ? role === 'BUYER'
                                            ? t('marketplace.modal.tradeInitiated.buyer')
                                            : t('marketplace.modal.tradeInitiated.supplier')
                                        : t('marketplace.modal.tradeRecorded.body', {
                                            status: tradeResult?.status.replaceAll('_', ' '),
                                        })}
                                </p>
                            </div>
                        ) : tradeState === 'outcome_unknown' ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="p-4 bg-amber-500/10 rounded-full mb-4">
                                    <AlertTriangle size={28} className="text-amber-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('marketplace.modal.outcomeUnknown.title')}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{tradeError}</p>
                                <button
                                    type="button"
                                    onClick={() => { void confirmTrade(); }}
                                    className="mb-3 w-full rounded-lg border border-amber-500 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-300"
                                >
                                    {t('marketplace.btn.retrySafely')}
                                </button>
                                <button type="button" onClick={closeTradeModal} className="px-6 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-600 transition-colors">
                                    {t('marketplace.btn.cancel')}
                                </button>
                            </div>
                        ) : tradeState === 'error' ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="p-4 bg-red-500/10 rounded-full mb-4">
                                    <AlertCircle size={28} className="text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('marketplace.modal.tradeFailed')}</h3>
                                {tradeError && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{tradeError}</p>}
                                {tradeKycBlocked && <KycRequiredNotice className="mb-4 w-full" />}
                                {tradeNeedsRefresh && (
                                    <button
                                        type="button"
                                        onClick={refreshReview}
                                        className="mb-3 w-full rounded-lg border border-emerald-500 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300"
                                    >
                                        {t('marketplace.modal.refreshReview')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={closeTradeModal}
                                    className="px-6 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    {t('marketplace.btn.cancel')}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                    <div>
                                        <h3 className="text-xl font-bold text-[#334155] dark:text-white">
                                            {t(configBase.counterAction.labelKey)}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {getOrderDisplayName(selectedOrder, t('marketplace.unknownProduct'))} &middot; {selectedOrder.region}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={t('marketplace.modal.close')}
                                        data-tour="trade-modal-close"
                                        onClick={closeTradeModal}
                                        disabled={tradeState === 'submitting'}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    {selectedOrder.is_demo_listing && (
                                        <div data-tour="trade-demo-warning" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-sm font-bold">{t('marketplace.demo.modalTitle')}</div>
                                                    <p className="mt-1 text-xs leading-5">{t('marketplace.demo.modalBody')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Order summary */}
                                    <div data-tour="trade-modal-summary" className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.product')}</span>
                                            <span className="flex items-center gap-2 text-right font-bold text-slate-800 dark:text-slate-200">
                                                {selectedOrder.is_demo_listing && (
                                                    <AlertCircle size={14} className="text-amber-500" aria-label={t('marketplace.demo.label')} />
                                                )}
                                                {getOrderDisplayName(selectedOrder, t('marketplace.unknownProduct'))}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.price')}</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                ${formatUsd(selectedOrder.price_per_mt_usd)} / MT
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">{t('marketplace.modal.location')}</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {selectedOrder.delivery_point_name || selectedOrder.region}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quantity input */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('marketplace.modal.quantity')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={Number.isFinite(tradeQuantity) ? tradeQuantity : ''}
                                                onChange={(e) => setTradeQuantity(Number(e.target.value))}
                                                max={selectedOrder.remaining_quantity_mt}
                                                min={0.01}
                                                step={0.01}
                                                aria-label={t('marketplace.modal.quantity')}
                                                disabled={tradeState === 'reviewing' || tradeState === 'submitting' || selectedOrder.is_demo_listing}
                                                className="w-full p-3 pl-4 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg text-lg font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900 dark:disabled:text-slate-400"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">MT</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 text-right">
                                            {t('marketplace.modal.maxAvailable')} {formatQuantity(selectedOrder.remaining_quantity_mt, locale)} MT
                                            {Number.isFinite(tradeQuantity) && tradeQuantity > 0 && selectedOrder.price_per_mt_usd > 0 && (
                                                <span className="ml-2 text-emerald-500 font-bold">
                                                    {t('marketplace.modal.total')} ${(tradeQuantity * selectedOrder.price_per_mt_usd).toLocaleString()}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {getBiofuelSpecification(selectedOrder.market_product) && <div className="text-sm text-slate-600 dark:text-slate-300">
                                        <p>{t(`${selectedOrder.market_product?.toLowerCase()}.contract`)}</p>
                                        <p>{selectedOrder.specification_standard}</p>
                                        <p>{formatQuantity(selectedOrder.carbon_intensity_gco2_mj, locale) || t('common.notAvailable')} gCO₂e/MJ · {selectedOrder.carbon_intensity_method}</p>
                                    </div>}
                                    {selectedOrder.market_product === 'UCOME_B100' && <div className="space-y-4">
                                        {selectedOrder.fame_terms && <details className="rounded-lg border border-slate-200 p-4 dark:border-slate-700" open>
                                            <summary className="cursor-pointer text-sm font-bold">{t('marketplace.b100.orderTerms')}</summary>
                                            <div className="mt-4"><FameOrderTermsDetails terms={selectedOrder.fame_terms} /></div>
                                        </details>}
                                        <form ref={tradeTermsForm} aria-label={t('marketplace.b100.takerTerms')} hidden={tradeState !== 'confirming'} onSubmit={event => { event.preventDefault(); reviewTrade(); }}>
                                            <FameOrderFields side={selectedOrder.side === 'ASK' ? 'BID' : 'ASK'} initial={initialBuyerTerms} pending={tradeState !== 'confirming'} />
                                        </form>
                                        {tradeState === 'reviewing' && tradeFameInput?.fame_terms && <section className="rounded-lg border border-emerald-200 p-4 dark:border-emerald-900">
                                            <h4 className="mb-3 text-sm font-bold">{t('marketplace.b100.takerTerms')}</h4>
                                            <FameOrderTermsDetails terms={tradeFameInput.fame_terms} />
                                            <p className="mt-3 text-xs text-slate-500">{t('marketplace.b100.reviewTerms')}</p>
                                        </section>}
                                        {tradeError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{tradeError}</p>}
                                    </div>}
                                    {selectedOrder.market_product === 'BIO_LNG' && <div className="space-y-4">
                                        {selectedOrder.lng_terms && <details className="rounded-lg border border-slate-200 p-4 dark:border-slate-700" open>
                                            <summary className="cursor-pointer text-sm font-bold">{t('marketplace.bioLng.orderTerms')}</summary>
                                            <div className="mt-4"><LngOrderTermsDetails terms={selectedOrder.lng_terms} /></div>
                                        </details>}
                                        <form ref={tradeLngTermsForm} aria-label={t('marketplace.bioLng.takerTerms')} hidden={tradeState !== 'confirming'} onSubmit={event => { event.preventDefault(); reviewTrade(); }}>
                                            <LngOrderFields side={selectedOrder.side === 'ASK' ? 'BID' : 'ASK'} initial={initialLngTaker} pending={tradeState !== 'confirming'} />
                                        </form>
                                        {tradeState === 'reviewing' && tradeLngInput?.lng_terms && <section className="rounded-lg border border-emerald-200 p-4 dark:border-emerald-900">
                                            <h4 className="mb-3 text-sm font-bold">{t('marketplace.bioLng.takerTerms')}</h4>
                                            <LngOrderTermsDetails terms={tradeLngInput.lng_terms} />
                                            <p className="mt-3 text-xs text-slate-500">{t('marketplace.bioLng.reviewTerms')}</p>
                                        </section>}
                                        {tradeError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{tradeError}</p>}
                                    </div>}
                                    {tradeState === 'reviewing' && (
                                        <div data-tour="trade-final-warning" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="font-bold">{t('marketplace.confirm.title')}</div>
                                                    <p className="mt-1 text-xs leading-5">{t('marketplace.confirm.body')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                                    <button
                                        type="button"
                                        onClick={tradeState === 'reviewing' ? () => setTradeState('confirming') : closeTradeModal}
                                        disabled={tradeState === 'submitting'}
                                        className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {tradeState === 'reviewing' ? t('marketplace.btn.back') : t('marketplace.btn.cancel')}
                                    </button>
                                    {selectedOrder.is_demo_listing ? (
                                        <button
                                            type="button"
                                            disabled
                                            data-tour="trade-demo-disabled-button"
                                            className="px-6 py-2.5 bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-lg flex items-center gap-2 disabled:cursor-not-allowed dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                                        >
                                            <AlertCircle size={18} />
                                            <span>{t('marketplace.demo.disabledButton')}</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={tradeState === 'reviewing' ? confirmTrade : reviewTrade}
                                            data-tour={tradeState === 'reviewing' ? 'trade-final-confirm-button' : 'trade-review-button'}
                                            disabled={!Number.isFinite(tradeQuantity) || tradeQuantity <= 0 || tradeQuantity > (selectedOrder?.remaining_quantity_mt ?? 0) || tradeState === 'submitting'}
                                            className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {tradeState === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                            <span>
                                                {tradeState === 'submitting'
                                                    ? t('marketplace.btn.submitting')
                                                    : tradeState === 'reviewing'
                                                        ? t('marketplace.btn.confirmFinal')
                                                        : t('marketplace.btn.confirm')}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}


    </>;
}
