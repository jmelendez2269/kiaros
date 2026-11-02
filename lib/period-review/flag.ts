import { featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'

/** Client-safe: NEXT_PUBLIC_KIAROS_PERIOD_REVIEW */
export function periodReviewPublicFlagEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_KIAROS_PERIOD_REVIEW,
): boolean {
  return featureFlagEnabled(value)
}

/** Server + build: KIAROS_PERIOD_REVIEW or public mirror (preview branch injection). */
export function periodReviewServerFlagEnabled(): boolean {
  return (
    featureFlagEnabled(process.env.KIAROS_PERIOD_REVIEW) ||
    featureFlagEnabled(process.env.NEXT_PUBLIC_KIAROS_PERIOD_REVIEW)
  )
}
