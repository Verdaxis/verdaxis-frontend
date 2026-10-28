import { ABILITY_IDS, type AbilityId } from '../types/abilities';

export interface AbilityRow {
  action: string;
  allowed: boolean;
  reason_code: string | null;
  reason: string | null;
}

/** A schema-1 response in which every action is allowed except the given denials. */
export function abilitiesPayload(
  denied: Partial<Record<AbilityId, { code: string; reason?: string }>> = {},
  overrides: { schema_version?: unknown; extraRows?: unknown[] } = {},
) {
  const rows: unknown[] = ABILITY_IDS.map((action): AbilityRow => {
    const denial = denied[action];
    return denial
      ? { action, allowed: false, reason_code: denial.code, reason: denial.reason ?? `server text for ${denial.code}` }
      : { action, allowed: true, reason_code: null, reason: null };
  });
  return {
    schema_version: overrides.schema_version ?? 1,
    abilities: [...rows, ...(overrides.extraRows ?? [])],
  };
}
