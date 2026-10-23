import { iaOnboarding5FlagEnabled } from '@/lib/onboarding/ia-onboarding-flag'

/** Server-friendly alias for Phase 6 onboarding IA. */
export function isIaOnboarding5Enabled(): boolean {
  return iaOnboarding5FlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5)
}
