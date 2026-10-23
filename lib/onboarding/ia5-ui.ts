/** Shared IA Phase 6 onboarding UI tokens (flag-on surfaces only). */

import type { Ia5OnboardingPath } from '@/lib/onboarding/ia-onboarding-routes'

export const ONBOARDING_IA5_FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2'

export const ONBOARDING_IA5_PRIMARY_BUTTON =
  'w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50'

export const ONBOARDING_IA5_BACK_BUTTON =
  'shrink-0 rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm font-medium text-bone-muted hover:text-bone disabled:opacity-50'

export const ONBOARDING_IA5_SECONDARY_BUTTON =
  'rounded-xl border border-border/80 bg-stone-900 px-3 py-2 text-sm text-bone hover:bg-stone-800 disabled:opacity-50'

export const ONBOARDING_IA5_INPUT =
  'w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45'

export const ONBOARDING_IA5_BUILDING_PROGRESS_LABEL =
  'text-[11px] uppercase tracking-[0.18em] text-[#A4A3B1]'

type AccessWindowState = 'active' | 'read_only' | 'expired' | 'revoked'

/** Best-effort paid vs free before /api/onboarding/complete (uses existing GET /api/profile). */
export function ia5PathFromAccessWindow(
  accessWindow: { state: AccessWindowState } | null | undefined,
): Ia5OnboardingPath {
  return accessWindow?.state === 'active' ? 'paid' : 'free'
}

export function onboardingIa5FieldClass(ia5: boolean, extra?: string): string {
  const base = extra ?? ONBOARDING_IA5_INPUT
  return ia5 ? `${base} ${ONBOARDING_IA5_FOCUS_RING}` : base
}
