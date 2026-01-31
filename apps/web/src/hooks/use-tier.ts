import type { SubscriptionTier } from "@qpp/shared-types";

import { useTenantFeatures } from "@/hooks/use-tenant-features";

/**
 * Hook to determine the current tenant's subscription tier.
 *
 * Derives tier from feature flags since the /features API currently only
 * returns feature flags, not the tier directly. This approach infers tier
 * based on which features are enabled:
 *
 * - Enterprise: deployToAutomation enabled
 * - Pro: advancedAutocomplete enabled (but not deployToAutomation)
 * - Free: neither pro nor enterprise features enabled
 *
 * Returns "free" while loading (fail-closed approach).
 */
export function useTier(): {
  tier: SubscriptionTier;
  isLoading: boolean;
} {
  const { data: features, isLoading } = useTenantFeatures();

  // Fail-closed: default to free while loading
  if (isLoading || !features) {
    return { tier: "free", isLoading };
  }

  // Enterprise has deployToAutomation
  if (features.deployToAutomation) {
    return { tier: "enterprise", isLoading: false };
  }

  // Pro has advancedAutocomplete (but not deployToAutomation)
  if (features.advancedAutocomplete) {
    return { tier: "pro", isLoading: false };
  }

  // Default to free
  return { tier: "free", isLoading: false };
}

/**
 * Constants for tier-based quota limits
 */
export const QUOTA_LIMITS = {
  savedQueries: {
    free: 5,
    pro: null, // unlimited
    enterprise: null, // unlimited
  },
} as const;

/**
 * Hook to get the saved query limit for the current tier
 */
export function useSavedQueryLimit(): number | null {
  const { tier } = useTier();

  // eslint-disable-next-line security/detect-object-injection -- tier is typed as SubscriptionTier enum
  return QUOTA_LIMITS.savedQueries[tier];
}
