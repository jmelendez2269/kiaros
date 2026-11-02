'use client'

import type { PeriodReviewPeriod } from './periods'

/**
 * Storage key for tracking whether a period review has been auto-opened.
 * Separate from the dismiss key so that dismissing the promo card doesn't affect auto-open,
 * and closing an auto-opened modal doesn't dismiss the promo card.
 */
export function periodReviewAutoOpenStorageKey(
  userId: string,
  period: Pick<PeriodReviewPeriod, 'kind' | 'periodStart'>,
): string {
  return `kiaros-period-review-auto-opened:${userId}:${period.kind}:${period.periodStart}`
}

/**
 * Check if a period review has already been auto-opened for this user.
 */
export function isPeriodReviewAutoOpened(
  userId: string,
  period: Pick<PeriodReviewPeriod, 'kind' | 'periodStart'>,
): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(periodReviewAutoOpenStorageKey(userId, period)) === '1'
  } catch {
    return false
  }
}

/**
 * Mark a period review as auto-opened for this user.
 */
export function markPeriodReviewAutoOpened(
  userId: string,
  period: Pick<PeriodReviewPeriod, 'kind' | 'periodStart'>,
): void {
  try {
    window.localStorage.setItem(periodReviewAutoOpenStorageKey(userId, period), '1')
  } catch {
    /* ignore quota / private mode */
  }
}
