import { useAuth } from '../../context/AuthContext';

/**
 * Release switch for the member offboarding actions. The backend routes are
 * dormant until they are enabled there; the interface is switched on together
 * with them by building with VITE_OFFBOARDING_ENABLED=true. Read at call time
 * so tests and previews can change it.
 */
export const isOffboardingEnabled = (): boolean =>
  import.meta.env.VITE_OFFBOARDING_ENABLED === 'true';

/** True only for a signed-in ADMIN while the release switch is on. */
export const useOffboardingAdmin = (): { allowed: boolean; actorId: string | null } => {
  const { user } = useAuth();
  const allowed = isOffboardingEnabled() && user?.role === 'ADMIN';
  return { allowed, actorId: allowed ? user?.id ?? null : null };
};
