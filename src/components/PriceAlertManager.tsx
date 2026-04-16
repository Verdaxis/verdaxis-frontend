import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Trash2, Plus, ArrowUp, ArrowDown, X, Loader2, Lock } from 'lucide-react';
import { api } from '../services/api';
import { PriceAlert, Product, Subscription } from '../types';
import { useNamespace } from '../hooks/useNamespace';
import { useToast } from './Toast';
import { getProductDisplayName, getProductDisplayNameFromReference } from '../utils/marketProduct';

const FREE_TIER_LIMIT = 5;

interface PriceAlertManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PriceAlertManager: React.FC<PriceAlertManagerProps> = ({ isOpen, onClose }) => {
    const { t, ready } = useNamespace('dashboard');
    const { addToast } = useToast();
    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Add-form state
    const [showForm, setShowForm] = useState(false);
    const [formProductId, setFormProductId] = useState('');
    const [formDirection, setFormDirection] = useState<'above' | 'below'>('above');
    const [formThreshold, setFormThreshold] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [a, prods, sub] = await Promise.allSettled([
                api.alerts.list(),
                api.catalog.products(),
                api.subscriptions.me(),
            ]);
            if (a.status === 'fulfilled') setAlerts(a.value);
            if (prods.status === 'fulfilled') {
                setProducts(prods.value);
                const active = prods.value.filter((p: Product) => p.is_active);
                if (active.length > 0 && !formProductId) setFormProductId(active[0].id);
            }
            if (sub.status === 'fulfilled') setSubscription(sub.value);
            else setSubscription({ id: '', org_id: '', tier: 'free', is_active: true });
        } finally {
            setLoading(false);
        }
    }, [formProductId]);

    useEffect(() => {
        if (isOpen) load();
    }, [isOpen, load]);

    const handleDelete = async (alertId: string) => {
        try {
            await api.alerts.delete(alertId);
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (e: any) {
            setError(e.message || t('priceAlerts.failedDelete'));
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const threshold = parseFloat(formThreshold);
        if (!formProductId || isNaN(threshold) || threshold <= 0) {
            setError(t('priceAlerts.fillAllFields'));
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const newAlert = await api.alerts.create({
                product_id: formProductId,
                direction: formDirection,
                threshold_usd: threshold,
            });
            setAlerts(prev => [newAlert, ...prev]);
            setShowForm(false);
            setFormThreshold('');
        } catch (e: any) {
            setError(e.message || t('priceAlerts.failedCreate'));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;
    if (!ready) return null;

    const tier = subscription?.tier ?? 'free';
    const isAtLimit = tier === 'free' && alerts.length >= FREE_TIER_LIMIT;

    const activeProducts = products.filter((product) => product.is_active);

    const productName = (alert: PriceAlert) =>
        alert.product_name
            || (alert.market_product ? getProductDisplayNameFromReference(alert.market_product, products) : '')
            || getProductDisplayNameFromReference(alert.product_id, products);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
        }}>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(5,10,20,0.6)' }}
            />

            {/* Slide-out panel */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                position: 'relative',
                width: 360,
                maxWidth: '95vw',
                height: '100vh',
                background: 'var(--ocean)',
                borderLeft: '1px solid var(--ocean-border)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'IBM Plex Mono', monospace",
                overflowY: 'auto',
            }}>
                {/* Panel header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--ocean-border)',
                    background: 'var(--abyss)',
                }}>
                    <Bell size={14} color="var(--amber, #FFB020)" />
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--terminal-text)', flex: 1 }}>
                        {t('priceAlerts.title')}
                    </span>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--terminal-dim)', cursor: 'pointer', padding: 2 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '16px 20px', flex: 1 }}>
                    {/* Alert usage bar */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}>
                        <span style={{ fontSize: 11, color: 'var(--terminal-muted)' }}>
                            {t('priceAlerts.alertsUsed', { used: alerts.length, limit: tier === 'free' ? FREE_TIER_LIMIT : '∞' })}
                        </span>
                        {tier === 'free' && (
                            <div style={{
                                display: 'flex',
                                gap: 4,
                                alignItems: 'center',
                            }}>
                                {Array.from({ length: FREE_TIER_LIMIT }).map((_, i) => (
                                    <div key={i} style={{
                                        width: 14,
                                        height: 4,
                                        borderRadius: 2,
                                        background: i < alerts.length ? 'var(--amber, #FFB020)' : 'rgba(255,255,255,0.1)',
                                    }} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '8px 12px',
                            background: 'rgba(255,59,59,0.1)',
                            border: '1px solid rgba(255,59,59,0.3)',
                            borderRadius: 4,
                            color: 'var(--danger, #FF3B3B)',
                            fontSize: 11,
                            marginBottom: 12,
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Add alert section */}
                    {isAtLimit ? (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(255,176,32,0.06)',
                            border: '1px solid rgba(255,176,32,0.2)',
                            borderRadius: 6,
                            marginBottom: 16,
                            textAlign: 'center',
                        }}>
                            <Lock size={18} color="var(--amber, #FFB020)" style={{ margin: '0 auto 8px' }} />
                            <div style={{ fontSize: 12, color: 'var(--amber, #FFB020)', fontWeight: 700, marginBottom: 4 }}>
                                {t('priceAlerts.limitReached')}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--terminal-muted)', marginBottom: 12 }}>
                                {t('priceAlerts.limitMessage', { limit: FREE_TIER_LIMIT })}
                            </div>
                            <button
                                onClick={() => addToast({ type: 'info', message: 'To upgrade your plan, go to Settings → Billing. Contact sales@verdaxis.exchange for Enterprise plans.' })}
                                style={{
                                    background: 'var(--amber, #FFB020)',
                                    border: 'none',
                                    borderRadius: 4,
                                    color: '#000',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '8px 20px',
                                    cursor: 'pointer',
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {t('priceAlerts.upgradePlan')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {!showForm ? (
                                <button
                                    onClick={() => setShowForm(true)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'rgba(0,102,255,0.08)',
                                        border: '1px dashed rgba(0,102,255,0.3)',
                                        borderRadius: 6,
                                        color: 'var(--sonar, #0066FF)',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        marginBottom: 16,
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        letterSpacing: '0.08em',
                                    }}
                                >
                                    <Plus size={12} />
                                    {t('priceAlerts.addAlert')}
                                </button>
                            ) : (
                                <form onSubmit={handleCreate} style={{
                                    background: 'rgba(0,102,255,0.05)',
                                    border: '1px solid rgba(0,102,255,0.2)',
                                    borderRadius: 6,
                                    padding: '14px',
                                    marginBottom: 16,
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--terminal-muted)', fontWeight: 700, marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                        {t('priceAlerts.newAlert')}
                                    </div>

                                    {/* Product */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ fontSize: 10, color: 'var(--terminal-dim)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {t('priceAlerts.product')}
                                        </label>
                                        <select
                                            value={formProductId}
                                            onChange={e => setFormProductId(e.target.value)}
                                            required
                                            style={{
                                                width: '100%',
                                                background: 'var(--abyss)',
                                                border: '1px solid rgba(0,102,255,0.2)',
                                                borderRadius: 4,
                                                color: 'var(--terminal-text)',
                                                fontSize: 11,
                                                padding: '6px 10px',
                                                fontFamily: "'IBM Plex Mono', monospace",
                                            }}
                                        >
                                            {activeProducts.map((product) => (
                                                <option key={product.id} value={product.id}>{getProductDisplayName(product)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Direction toggle */}
                                    <div style={{ marginBottom: 10 }}>
                                        <label style={{ fontSize: 10, color: 'var(--terminal-dim)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {t('priceAlerts.direction')}
                                        </label>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {(['above', 'below'] as const).map(dir => (
                                                <button
                                                    key={dir}
                                                    type="button"
                                                    onClick={() => setFormDirection(dir)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px 0',
                                                        background: formDirection === dir
                                                            ? (dir === 'above' ? 'rgba(0,212,170,0.15)' : 'rgba(255,59,59,0.15)')
                                                            : 'transparent',
                                                        border: `1px solid ${formDirection === dir
                                                            ? (dir === 'above' ? 'var(--bio, #00D4AA)' : 'var(--danger, #FF3B3B)')
                                                            : 'rgba(255,255,255,0.1)'}`,
                                                        borderRadius: 4,
                                                        color: formDirection === dir
                                                            ? (dir === 'above' ? 'var(--bio, #00D4AA)' : 'var(--danger, #FF3B3B)')
                                                            : '#666',
                                                        cursor: 'pointer',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 4,
                                                        fontFamily: "'IBM Plex Mono', monospace",
                                                    }}
                                                >
                                                    {dir === 'above' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                                    {dir === 'above' ? t('priceAlerts.above') : t('priceAlerts.below')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Threshold */}
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ fontSize: 10, color: 'var(--terminal-dim)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {t('priceAlerts.threshold')}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={formThreshold}
                                            onChange={e => setFormThreshold(e.target.value)}
                                            placeholder={t('priceAlerts.thresholdPlaceholder')}
                                            required
                                            style={{
                                                width: '100%',
                                                background: 'var(--abyss)',
                                                border: '1px solid rgba(0,102,255,0.2)',
                                                borderRadius: 4,
                                                color: 'var(--terminal-text)',
                                                fontSize: 11,
                                                padding: '6px 10px',
                                                fontFamily: "'IBM Plex Mono', monospace",
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            type="button"
                                            onClick={() => { setShowForm(false); setError(''); }}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'transparent',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 4,
                                                color: 'var(--terminal-muted)',
                                                fontSize: 11,
                                                cursor: 'pointer',
                                                fontFamily: "'IBM Plex Mono', monospace",
                                            }}
                                        >
                                            {t('priceAlerts.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            style={{
                                                flex: 2,
                                                padding: '8px',
                                                background: 'var(--sonar, #0066FF)',
                                                border: 'none',
                                                borderRadius: 4,
                                                color: '#fff',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                cursor: submitting ? 'not-allowed' : 'pointer',
                                                opacity: submitting ? 0.6 : 1,
                                                fontFamily: "'IBM Plex Mono', monospace",
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            {submitting && <Loader2 size={11} className="animate-spin" />}
                                            {t('priceAlerts.setAlert')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}

                    {/* Alert list */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', color: 'var(--terminal-dim)' }}>
                            <Loader2 size={18} className="animate-spin" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--terminal-dim)', fontSize: 11, padding: '20px 0' }}>
                            {t('priceAlerts.noAlerts')}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {alerts.map(alert => {
                                const triggered = !!alert.triggered_at;
                                const dirColor = alert.direction === 'above' ? 'var(--bio, #00D4AA)' : 'var(--danger, #FF3B3B)';
                                return (
                                    <div
                                        key={alert.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 10,
                                            padding: '10px 12px',
                                            background: triggered ? 'rgba(255,176,32,0.05)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${triggered ? 'rgba(255,176,32,0.25)' : 'rgba(255,255,255,0.06)'}`,
                                            borderRadius: 6,
                                        }}
                                    >
                                        <div style={{ marginTop: 2 }}>
                                            {alert.direction === 'above'
                                                ? <ArrowUp size={13} color={dirColor} />
                                                : <ArrowDown size={13} color={dirColor} />
                                            }
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 11, color: 'var(--terminal-text)', marginBottom: 2 }}>
                                                {productName(alert)}
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: dirColor }}>
                                                {alert.direction === 'above' ? t('priceAlerts.directionAbove') : t('priceAlerts.directionBelow')} ${Number(alert.threshold_usd).toFixed(2)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <span style={{
                                                    fontSize: 9,
                                                    fontWeight: 700,
                                                    padding: '2px 6px',
                                                    borderRadius: 3,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.08em',
                                                    background: triggered
                                                        ? 'rgba(255,176,32,0.15)'
                                                        : alert.is_active
                                                            ? 'rgba(0,212,170,0.1)'
                                                            : 'rgba(255,255,255,0.05)',
                                                    color: triggered
                                                        ? 'var(--amber, #FFB020)'
                                                        : alert.is_active
                                                            ? 'var(--bio, #00D4AA)'
                                                            : '#666',
                                                }}>
                                                    {triggered ? t('priceAlerts.statusTriggered') : alert.is_active ? t('priceAlerts.statusActive') : t('priceAlerts.statusInactive')}
                                                </span>
                                                {triggered && alert.triggered_at && (
                                                    <span style={{ fontSize: 9, color: 'var(--terminal-dim)' }}>
                                                        {new Date(alert.triggered_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(alert.id)}
                                            title={t('priceAlerts.deleteAlert')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--terminal-dim)',
                                                cursor: 'pointer',
                                                padding: 2,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
