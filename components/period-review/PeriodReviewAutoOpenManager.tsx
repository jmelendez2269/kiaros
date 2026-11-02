'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { latestClosedMonth, latestClosedQuarter } from '@/lib/period-review/periods'
import { choosePeriodToAutoOpen } from '@/lib/period-review/auto-open'
import {
  isPeriodReviewAutoOpened,
  markPeriodReviewAutoOpened,
  periodReviewAutoOpenStorageKey,
} from '@/lib/period-review/auto-open-storage'
import { usePeriodReview } from './PeriodReviewProvider'

interface AutoOpenManagerProps {
  /** The current date in YYYY-MM-DD format (same as the Today page uses; honours mockToday off production). */
  todayDate: string
  /**
   * Server-computed: true only off production (VERCEL_ENV !== 'production').
   * When false, the forceAutoOpen and clearAutoOpen query params are ignored.
   */
  allowTestParams: boolean
}

/**
 * Auto-opens the period review modal on Today once per period per user, during the
 * review window (last day of the period through day 7 of the next). Quarter first
 * when both are due. Never generates: the modal opens with autoGenerate false and
 * makes no POST; generation stays a user tap. Seen is stored in localStorage, keyed
 * by user, kind and period start, and is written when the modal opens, so closing
 * it (or leaving) never re-opens it for that period.
 *
 * Preview/dev only (inert in production):
 * - ?forceAutoOpen=month|quarter force-opens that period (ignores the window)
 * - ?clearAutoOpen=1 clears the seen keys for the current periods
 */
export function PeriodReviewAutoOpenManager({ todayDate, allowTestParams }: AutoOpenManagerProps) {
  const searchParams = useSearchParams()
  const { isLoaded, user } = useUser()
  const { openPeriodReview } = usePeriodReview()
  const hasTriedAutoOpen = useRef(false)

  useEffect(() => {
    if (hasTriedAutoOpen.current) return
    // Wait for Clerk to load before using the one try per mount.
    if (!isLoaded) return
    hasTriedAutoOpen.current = true
    if (!user?.id) return
    const userId = user.id

    if (allowTestParams) {
      if (searchParams.get('clearAutoOpen') === '1') {
        try {
          window.localStorage.removeItem(periodReviewAutoOpenStorageKey(userId, latestClosedMonth(todayDate)))
          window.localStorage.removeItem(periodReviewAutoOpenStorageKey(userId, latestClosedQuarter(todayDate)))
        } catch {
          /* ignore */
        }
        return
      }
      const forceOpen = searchParams.get('forceAutoOpen')
      if (forceOpen === 'month' || forceOpen === 'quarter') {
        const period = forceOpen === 'month' ? latestClosedMonth(todayDate) : latestClosedQuarter(todayDate)
        markPeriodReviewAutoOpened(userId, period)
        openPeriodReview(period.kind, period.planYear, period.index, { autoGenerate: false })
        return
      }
    }

    const period = choosePeriodToAutoOpen(todayDate, (p) => isPeriodReviewAutoOpened(userId, p))
    if (!period) return
    markPeriodReviewAutoOpened(userId, period)
    openPeriodReview(period.kind, period.planYear, period.index, { autoGenerate: false })
  }, [todayDate, isLoaded, user?.id, openPeriodReview, searchParams, allowTestParams])

  return null
}
