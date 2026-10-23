import { featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'

/** Phase 6 IA: five-screen onboarding (NEXT_PUBLIC_IA_ONBOARDING5). */
export function iaOnboarding5FlagEnabled(value: string | undefined = process.env.NEXT_PUBLIC_IA_ONBOARDING5): boolean {
  return featureFlagEnabled(value)
}
