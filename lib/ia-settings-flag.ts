import { featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'

/** Phase 5 IA: Settings regroup (birth data first, section nav). */
export function isIaSettingsEnabled(): boolean {
  return featureFlagEnabled(process.env.NEXT_PUBLIC_IA_SETTINGS)
}
