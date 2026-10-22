import { featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'

/** Phase 3 IA overlays: Stelloquy tab, notice area, feedback in help menu. */
export function isIaOverlaysEnabled(): boolean {
  return featureFlagEnabled(process.env.NEXT_PUBLIC_IA_OVERLAYS)
}
