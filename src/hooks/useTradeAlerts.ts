import { useCallback, useEffect, useRef } from 'react';
import type { TFunction } from 'i18next';

import { api } from '../services/api';
import { openTradeAlertElection, type TradeAlertElection } from '../services/tradeAlertElection';
import { getTradeAlertPermission, showTradeAlertNotification } from '../services/tradeAlertNotifications';
import { isTradeNotificationOn, readTradeAlertPreferences } from '../services/tradeAlertPreferences';
import {
  playTradeAlertTone,
  unlockTradeAlertAudioOnFirstGesture,
  type TradeAlertTone,
} from '../services/tradeAlertSound';
import { useTradeAlertSettings } from './useTradeAlertSettings';

export type TradeAlertKind = 'created' | 'confirmed' | 'declined' | 'autoMatched';

// Only these stream events raise an alert. `reconnect`, `reset`, heartbeats and
// the other trade lifecycle events (delivered, paid) are deliberately absent.
const ALERT_KIND_BY_EVENT: Record<string, TradeAlertKind> = {
  trade_created: 'created',
  trade_confirmed: 'confirmed',
  trade_declined: 'declined',
  trade_auto_matched: 'autoMatched',
};

const TONE_BY_KIND: Record<TradeAlertKind, TradeAlertTone> = {
  created: 'action',
  confirmed: 'done',
  autoMatched: 'done',
  declined: 'declined',
};

/** How many of the newest trades awaiting the user's action to search for the new trade. */
const ACTION_REQUIRED_LOOKUP_LIMIT = 20;

export const tradeAlertKindForEvent = (event: string): TradeAlertKind | null => (
  ALERT_KIND_BY_EVENT[event] ?? null
);

/**
 * `trade_created` goes to BOTH parties and says nothing about who started the
 * trade. The alert is for the party who must confirm it, so ask the server,
 * which also applies its own rules (KYC, user ownership, assisted orders).
 * Any failure means no alert: a missed "needs your action" tone is better
 * than one that wrongly tells the trade's initiator to act.
 */
const needsMyConfirmation = async (tradeId: string | null): Promise<boolean> => {
  if (!tradeId) return false;
  try {
    const page = await api.trades.myTradesPaged({ action_required: true, limit: ACTION_REQUIRED_LOOKUP_LIMIT });
    return page.items.some((trade) => String(trade.id) === tradeId);
  } catch {
    return false;
  }
};

const tradeIdOf = (data: unknown): string | null => {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const id = record.id ?? record.trade_id;
  return typeof id === 'string' && id ? id : null;
};

/**
 * One key per stream event, the same in every tab. The durable stream id is
 * best; without it, the event name and payload are equally stable.
 */
const eventKeyOf = (event: string, data: unknown, eventId: string | undefined): string => {
  if (eventId) return `id:${eventId}`;
  return `${event}:${tradeIdOf(data) ?? JSON.stringify(data) ?? ''}`;
};

interface UseTradeAlertsOptions {
  userId: string;
  /** An admin acting for a customer: no sound or notification at all. */
  isMarketSupportActive: boolean;
  /** `trading` namespace translator. */
  t: TFunction;
  onOpenMyTrades: () => void;
}

/**
 * Optional sound and browser notification for private trade events. It does
 * not open a stream: `TradeNotifier` passes each event of its one stream to the
 * returned handler.
 */
export const useTradeAlerts = ({ userId, isMarketSupportActive, t, onOpenMyTrades }: UseTradeAlertsOptions) => {
  const settings = useTradeAlertSettings(userId);
  const electionRef = useRef<TradeAlertElection | null>(null);

  // The handler is long-lived (the stream keeps the first one it saw), so it
  // reads current values through this ref.
  const latest = useRef({ userId, isMarketSupportActive, t, onOpenMyTrades });
  latest.current = { userId, isMarketSupportActive, t, onOpenMyTrades };

  useEffect(() => {
    const election = openTradeAlertElection();
    electionRef.current = election;
    return () => {
      election.close();
      electionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (settings.soundEnabled) unlockTradeAlertAudioOnFirstGesture();
  }, [settings.soundEnabled]);

  return useCallback((event: string, data: unknown, eventId?: string) => {
    const kind = tradeAlertKindForEvent(event);
    const election = electionRef.current;
    if (!kind || !election) return;

    const { userId: currentUserId, isMarketSupportActive: inSupport } = latest.current;
    if (inSupport) return;
    // Read stored choices and the browser permission now, not from render
    // state: the permission can be granted by the sign-in prompt a moment ago.
    const preferences = readTradeAlertPreferences(currentUserId);
    const wantsSound = preferences.sound;
    const wantsNotification = isTradeNotificationOn(preferences, getTradeAlertPermission() === 'granted');
    if (!wantsSound && !wantsNotification) return;

    const key = eventKeyOf(event, data, eventId);
    void (async () => {
      const { won, anyTabVisible } = await election.claim(key);
      if (!won) return;
      if (kind === 'created' && !(await needsMyConfirmation(tradeIdOf(data)))) return;

      // Both the election and the lookup took time; look again.
      const { isMarketSupportActive: stillInSupport, t: translate, onOpenMyTrades: openMyTrades } = latest.current;
      if (stillInSupport) return;

      if (wantsSound) playTradeAlertTone(TONE_BY_KIND[kind]);

      // `anyTabVisible` also covers a visible peer tab: Verdaxis is then in
      // front, not in the background.
      if (wantsNotification && document.visibilityState === 'hidden' && !anyTabVisible) {
        showTradeAlertNotification({
          title: translate(`tradeAlerts.${kind}.title`),
          body: translate(`tradeAlerts.${kind}.body`),
          tag: key,
          onClick: () => {
            window.focus();
            openMyTrades();
          },
        });
      }
    })();
  }, []);
};
