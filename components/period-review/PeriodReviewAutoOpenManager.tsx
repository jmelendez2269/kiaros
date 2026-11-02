'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  isPromoWindow,
  latestClosedMonth,
  latestClosedQuarter,
  type PeriodReviewPeriod,
} from '@/lib/period-review/periods'
import { isPeriodReviewAutoOpened, markPeriodReviewAutoOpened } from '@/lib/period-review/auto-open-storage'
import { usePeriodReview } from './PeriodReviewProvider'

interface AutoOpenManagerProps {
  /**
   * The current date in YYYY-MM-DD format (same as Today page uses).
   * Passed in so we can test with different dates in dev/preview.
   */
  todayDate: string
}

/**
 * Manages the auto-open behavior for period review modals.
 *
 * Rules:
 * - Auto-opens once per period per user during the review window (last day of period through day 7 of next)
 * - If both month and quarter are due, opens quarter first, then month on next visit
 * - Never auto-generates (generation stays a user tap)
 * - Tracks "auto-opened" status in localStorage keyed by user ID + kind + period
 *
 * Dev/preview testing:
 * - Add ?forceAutoOpen=month or ?forceAutoOpen=quarter to force-open that period (ignores window check)
 * - Add ?clearAutoOpen=1 to clear all auto-open storage for the current user
 */
export function PeriodReviewAutoOpenManager({ todayDate }: AutoOpenManagerProps) {
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { openPeriodReview } = usePeriodReview()
  const hasTriedAutoOpen = useRef(false)

  useEffect(() => {
    // Only try once per mount
    if (hasTriedAutoOpen.current) return
    hasTriedAutoOpen.current = true

    // Must have a signed-in user
    if (!user?.id) return

    const userId = user.id

    // Dev/preview testing: clear storage
    if (searchParams.get('clearAutoOpen') === '1') {
      const monthPeriod = latestClosedMonth(todayDate)
      const quarterPeriod = latestClosedQuarter(todayDate)
      if (typeof window !== 'undefined') {
        try {
          const monthKey = `kiaros-period-review-auto-opened:${userId}:${monthPeriod.kind}:${monthPeriod.periodStart}`
          const quarterKey = `kiaros-period-review-auto-opened:${userId}:${quarterPeriod.kind}:${quarterPeriod.periodStart}`
          window.localStorage.removeItem(monthKey)
          window.localStorage.removeItem(quarterKey)
          console.log('[auto-open] Cleared storage for', { monthKey, quarterKey })
        } catch {
          /* ignore */
        }
      }
      return
    }

    // Dev/preview testing: force open a specific period
    const forceOpen = searchParams.get('forceAutoOpen')
    if (forceOpen === 'month' || forceOpen === 'quarter') {
      const period = forceOpen === 'month' ? latestClosedMonth(todayDate) : latestClosedQuarter(todayDate)
      console.log('[auto-open] Force-opening', forceOpen, period)
      markPeriodReviewAutoOpened(userId, period)
      openPeriodReview(period.kind, period.planYear, period.index, {
        autoGenerate: false,
      })
      return
    }

    // Normal auto-open logic
    // Check which periods are in their promo window
    const monthPeriod = latestClosedMonth(todayDate)
    const quarterPeriod = latestClosedQuarter(todayDate)

    const monthInWindow = isPromoWindow(todayDate, monthPeriod)
    const quarterInWindow = isPromoWindow(todayDate, quarterPeriod)

    // Determine which periods haven't been auto-opened yet
    const monthNotOpened = monthInWindow && !isPeriodReviewAutoOpened(userId, monthPeriod)
    const quarterNotOpened = quarterInWindow && !isPeriodReviewAutoOpened(userId, quarterPeriod)

    // Priority: quarter first, then month
    let periodToOpen: PeriodReviewPeriod | null = null

    if (quarterNotOpened) {
      periodToOpen = quarterPeriod
    } else if (monthNotOpened) {
      periodToOpen = monthPeriod
    }

    // Auto-open if we have a period to show
    if (periodToOpen) {
      markPeriodReviewAutoOpened(userId, periodToOpen)
      openPeriodReview(periodToOpen.kind, periodToOpen.planYear, periodToOpen.index, {
        autoGenerate: false, // Never auto-generate
      })
    }
  }, [todayDate, user?.id, openPeriodReview, searchParams])

  // This component renders nothing; it only manages auto-open logic
  return null
}
