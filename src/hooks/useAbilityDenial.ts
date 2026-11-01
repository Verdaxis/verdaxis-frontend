import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAbilities } from '../context/AbilitiesContext';
import { useMarketSupport } from '../context/MarketSupportContext';
import { MARKET_ACTION_IDS, type AbilityDenial, type AbilityId } from '../types/abilities';

/**
 * Returns a function that tells why an action is denied, or `null` when the
 * control should behave as it always did. Call it once per component, then use
 * it for any number of controls (including rows of a list).
 *
 * It returns `null` when:
 * - the server has not said anything about the action (not loaded, failed,
 *   older backend): the existing behavior stays in force;
 * - the action is allowed;
 * - an assisted Market Support context is active and the action is a market
 *   action: the server then judges the supported organization, not the
 *   administrator's own account.
 *
 * The message is the localized text for the reason code. A code this client
 * has no text for falls back to the server's English `reason`, then to a
 * generic sentence, so a new server-side code is still shown as a denial.
 */
export function useAbilityGate(): (action: AbilityId | null) => AbilityDenial | null {
  const { abilities } = useAbilities();
  const { isActive: isMarketSupportActive } = useMarketSupport();
  const { t } = useTranslation('common');

  return useCallback((action) => {
    if (!action) return null;
    if (isMarketSupportActive && MARKET_ACTION_IDS.has(action)) return null;
    const ability = abilities.get(action);
    if (!ability || ability.allowed) return null;

    const fallback = ability.reason ?? t('abilities.reason.unknown');
    const message = ability.reasonCode
      ? t(`abilities.reason.${ability.reasonCode}`, { defaultValue: fallback })
      : fallback;
    return { reasonCode: ability.reasonCode, message };
  }, [abilities, isMarketSupportActive, t]);
}

/** Single-action form of `useAbilityGate`. Pass `null` to opt out for this render. */
export function useAbilityDenial(action: AbilityId | null): AbilityDenial | null {
  return useAbilityGate()(action);
}

/**
 * Whether any of the actions is allowed, for entries that group several
 * abilities (the Admin area). `undefined` means the server has not answered
 * for any of them, so the caller keeps its existing rule.
 */
export function useAnyAbilityAllowed(actions: readonly AbilityId[]): boolean | undefined {
  const { abilities } = useAbilities();
  const known = actions.flatMap((action) => {
    const ability = abilities.get(action);
    return ability ? [ability] : [];
  });
  if (known.length === 0) return undefined;
  return known.some((ability) => ability.allowed);
}
