import {
  SUPPORTED_ABILITIES_SCHEMA_VERSION,
  type Ability,
  type AbilityMap,
} from '../types/abilities';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseAbility = (entry: unknown): [string, Ability] | null => {
  if (!isRecord(entry)) return null;
  const { action, allowed, reason_code: reasonCode, reason } = entry;
  if (typeof action !== 'string' || typeof allowed !== 'boolean') return null;
  return [action, {
    allowed,
    reasonCode: typeof reasonCode === 'string' ? reasonCode : null,
    reason: typeof reason === 'string' ? reason : null,
  }];
};

/**
 * Turns a `/auth/me/abilities` body into a lookup map.
 *
 * Returns `null` when the body cannot be trusted as a whole: it is not an
 * object, the `schema_version` is not the one this client understands, or
 * `abilities` is not a list. A single malformed entry is skipped instead, so
 * one bad row cannot disable the other hints; its action then reads as unknown.
 */
export function parseAbilitiesResponse(body: unknown): AbilityMap | null {
  if (!isRecord(body)) return null;
  if (body.schema_version !== SUPPORTED_ABILITIES_SCHEMA_VERSION) return null;
  if (!Array.isArray(body.abilities)) return null;

  const abilities = new Map<string, Ability>();
  for (const entry of body.abilities) {
    const parsed = parseAbility(entry);
    if (parsed) abilities.set(parsed[0], parsed[1]);
  }
  return abilities;
}

/**
 * True when the backend does not serve the abilities route (an older
 * deployment). Retrying cannot help until the backend is upgraded, unlike a
 * network failure or a 5xx.
 */
export const isAbilitiesRouteMissing = (error: unknown): boolean => {
  const status = isRecord(error) ? error.status : undefined;
  return status === 404 || status === 405;
};
