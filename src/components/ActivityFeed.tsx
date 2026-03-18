import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';

interface FeedEvent {
    id: string;
    event: string;
    description: string;
    timestamp: Date;
    isParticipant?: boolean;
}

const EVENT_CONFIG: Record<string, { icon: string; color: string; participantOnly: boolean }> = {
    new_listing:            { icon: '●',  color: 'var(--sonar, #0066FF)',   participantOnly: false },
    price_crossing:         { icon: '⚠',  color: 'var(--amber, #FFB020)',   participantOnly: false },
    trade_matched:          { icon: '✓',  color: 'var(--bio, #00D4AA)',     participantOnly: false },
    order_outbid:           { icon: '⚡', color: 'var(--danger, #FF3B3B)',  participantOnly: true  },
    price_alert_triggered:  { icon: '🔔', color: 'var(--amber, #FFB020)',   participantOnly: true  },
};

const describeEvent = (event: string, data: Record<string, unknown>): string => {
    switch (event) {
        case 'new_listing':
            return `New ${data.fuel_type || 'fuel'} listing — ${data.quantity_mt ? `${Number(data.quantity_mt).toLocaleString()} MT` : ''} ${data.region ? `at ${data.region}` : ''}`.trim();
        case 'price_crossing':
            return `Price crossed $${data.threshold_usd ?? data.price ?? '—'} for ${data.fuel_type || 'fuel'}`;
        case 'trade_matched':
            return `Trade matched — ${data.quantity_mt ? `${Number(data.quantity_mt).toLocaleString()} MT` : ''} @ $${data.price ?? '—'}`.trim();
        case 'order_outbid':
            return `Your order was outbid — new best: $${data.new_best_price ?? '—'}`;
        case 'price_alert_triggered':
            return `Price alert triggered — ${data.direction === 'above' ? '↑ above' : '↓ below'} $${data.threshold_usd ?? '—'}`;
        default:
            return event.replace(/_/g, ' ');
    }
};

const formatRelativeTime = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();
    const secs = Math.floor(diffMs / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
};

let eventCounter = 0;

export const ActivityFeed: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [events, setEvents] = useState<FeedEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<EventSource | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const backoffRef = useRef(1000);
    // Force re-render for relative timestamps
    const [, setTick] = useState(0);

    const connect = useCallback(() => {
        const token = localStorage.getItem('token');
        const url = token
            ? `${API_URL}/stream/activity?token=${encodeURIComponent(token)}`
            : `${API_URL}/stream/activity`;

        const source = new EventSource(url);
        sourceRef.current = source;

        source.onopen = () => {
            setIsConnected(true);
            backoffRef.current = 1000;
        };

        source.onmessage = (e) => {
            try {
                const parsed = JSON.parse(e.data);
                const eventType = parsed.event || 'unknown';
                const data: Record<string, unknown> = parsed.data ?? parsed;
                const cfg = EVENT_CONFIG[eventType];
                const newEvent: FeedEvent = {
                    id: `evt-${++eventCounter}`,
                    event: eventType,
                    description: describeEvent(eventType, data),
                    timestamp: new Date(),
                    isParticipant: cfg?.participantOnly ?? false,
                };
                setEvents(prev => [newEvent, ...prev].slice(0, 100));
            } catch {
                // ignore malformed
            }
        };

        // Handle typed events too
        for (const evtType of Object.keys(EVENT_CONFIG)) {
            source.addEventListener(evtType, (e: MessageEvent) => {
                try {
                    const data: Record<string, unknown> = JSON.parse(e.data);
                    const cfg = EVENT_CONFIG[evtType];
                    const newEvent: FeedEvent = {
                        id: `evt-${++eventCounter}`,
                        event: evtType,
                        description: describeEvent(evtType, data),
                        timestamp: new Date(),
                        isParticipant: cfg?.participantOnly ?? false,
                    };
                    setEvents(prev => [newEvent, ...prev].slice(0, 100));
                } catch {
                    // ignore
                }
            });
        }

        source.onerror = () => {
            source.close();
            sourceRef.current = null;
            setIsConnected(false);
            const delay = backoffRef.current + Math.random() * 500;
            reconnectTimerRef.current = setTimeout(connect, delay);
            backoffRef.current = Math.min(backoffRef.current * 2, 30000);
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            sourceRef.current?.close();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [connect]);

    // Update relative timestamps every 30s
    useEffect(() => {
        const interval = setInterval(() => setTick(tick => tick + 1), 30_000);
        return () => clearInterval(interval);
    }, []);

    if (!ready) return null;

    return (
        <div style={{
            background: 'var(--abyss, #050A14)',
            border: '1px solid rgba(0,102,255,0.15)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'IBM Plex Mono', monospace",
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'var(--ocean, #0A1628)',
            }}>
                <Activity size={12} color="var(--bio, #00D4AA)" />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888' }}>
                    {t('activityFeed.title')}
                </span>
                <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isConnected ? 'var(--bio, #00D4AA)' : 'var(--danger, #FF3B3B)',
                    marginLeft: 2,
                    ...(isConnected ? { animation: 'pulse 2s infinite' } : {}),
                }} />
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#555' }}>
                    {events.length > 0 ? t('activityFeed.events', { count: events.length }) : ''}
                </span>
            </div>

            {/* Feed */}
            <div
                ref={scrollRef}
                style={{
                    overflowY: 'auto',
                    maxHeight: 280,
                    minHeight: 120,
                }}
            >
                {events.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 120,
                        flexDirection: 'column',
                        gap: 8,
                        color: '#444',
                    }}>
                        <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#333',
                            animation: 'pulse 2s infinite',
                        }} />
                        <span style={{ fontSize: 11 }}>{t('activityFeed.noActivity')}</span>
                    </div>
                ) : (
                    events.map((evt) => {
                        const cfg = EVENT_CONFIG[evt.event] ?? { icon: '·', color: '#888', participantOnly: false };
                        return (
                            <div
                                key={evt.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: '8px 14px',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    ...(evt.isParticipant ? {
                                        borderLeft: `2px solid ${cfg.color}`,
                                        background: 'rgba(255,255,255,0.02)',
                                    } : {}),
                                }}
                            >
                                <span style={{
                                    fontSize: 13,
                                    color: cfg.color,
                                    flexShrink: 0,
                                    marginTop: 1,
                                    fontFamily: 'monospace',
                                }}>
                                    {cfg.icon}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, color: '#ccc', wordBreak: 'break-word' }}>
                                        {evt.description}
                                    </div>
                                </div>
                                <span style={{ fontSize: 10, color: '#555', flexShrink: 0, marginTop: 1 }}>
                                    {formatRelativeTime(evt.timestamp)}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
