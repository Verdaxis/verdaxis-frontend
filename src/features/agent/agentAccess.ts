import type { AbilitiesStatus } from '../../context/AbilitiesContext';
import type { Ability } from '../../types/abilities';

export function getAgentAccess(status: AbilitiesStatus, ability?: Ability) {
    if (status !== 'ready' || !ability) return null;
    if (ability.allowed) return 'allowed';
    return ability.reasonCode === 'AGENT_PAUSED' ? 'paused' : null;
}
