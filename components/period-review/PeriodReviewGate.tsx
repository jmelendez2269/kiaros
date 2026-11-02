'use client'

import { periodReviewPublicFlagEnabled } from '@/lib/period-review/flag'
import { PeriodReviewProvider } from '@/components/period-review/PeriodReviewProvider'

export function PeriodReviewGate({ children }: { children: React.ReactNode }) {
  if (!periodReviewPublicFlagEnabled()) return children
  return <PeriodReviewProvider>{children}</PeriodReviewProvider>
}
