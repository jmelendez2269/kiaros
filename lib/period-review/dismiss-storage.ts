'use client'

import { periodReviewDismissStorageKey } from './copy'
import type { PeriodReviewPeriod } from './periods'

export function isPeriodReviewDismissed(period: Pick<PeriodReviewPeriod, 'kind' | 'periodStart'>): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(periodReviewDismissStorageKey(period)) === '1'
  } catch {
    return false
  }
}

export function dismissPeriodReviewPromo(period: Pick<PeriodReviewPeriod, 'kind' | 'periodStart'>): void {
  try {
    window.localStorage.setItem(periodReviewDismissStorageKey(period), '1')
  } catch {
    /* ignore quota / private mode */
  }
}
