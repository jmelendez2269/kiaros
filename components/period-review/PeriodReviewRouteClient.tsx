'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PeriodReviewKind } from '@/lib/period-review/periods'
import { PeriodReviewDeepLink, usePeriodReview } from './PeriodReviewProvider'

export function PeriodReviewRouteClient({
  kind,
  year,
  index,
  redirectTo,
}: {
  kind: PeriodReviewKind
  year: number
  index: number
  redirectTo: string
}) {
  const router = useRouter()
  const { isOpen } = usePeriodReview()
  const wasOpen = useRef(false)

  useEffect(() => {
    if (isOpen) wasOpen.current = true
    if (wasOpen.current && !isOpen) {
      router.replace(redirectTo)
    }
  }, [isOpen, redirectTo, router])

  return <PeriodReviewDeepLink kind={kind} year={year} index={index} />
}
