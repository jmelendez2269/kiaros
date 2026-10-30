import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getUserProfileId } from '@/lib/ai/usage'
import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import { loadPeriodReviewCacheStatus } from '@/lib/period-review/cache'
import { cacheKey, periodFor } from '@/lib/period-review/periods'

export const dynamic = 'force-dynamic'

function disabledResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(req: Request) {
  if (!isPeriodReviewEnabled()) return disabledResponse()

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const planYear = Number(new URL(req.url).searchParams.get('planYear'))
  if (!Number.isInteger(planYear) || planYear < 2000 || planYear > 2100) {
    return NextResponse.json({ error: 'Invalid plan year' }, { status: 400 })
  }

  const profileId = await getUserProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const status = await loadPeriodReviewCacheStatus(profileId, planYear)

  const months = Array.from({ length: 12 }, (_, i) => {
    const index = i + 1
    const period = periodFor('month', planYear, index)
    return { index, cached: Boolean(status[cacheKey(period)]) }
  })

  const quarters = Array.from({ length: 4 }, (_, i) => {
    const index = i + 1
    const period = periodFor('quarter', planYear, index)
    return { index, cached: Boolean(status[cacheKey(period)]) }
  })

  return NextResponse.json({ planYear, months, quarters })
}
