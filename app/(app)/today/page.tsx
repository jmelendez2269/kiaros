import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { DataUnavailable } from '@/components/shared/DataUnavailable'
import { isTodayRestructureEnabled } from '@/lib/feature-flags'
import { loadTodayPageData } from '@/lib/today/load-today-page-data'
import { TodayPageLegacy } from '@/components/today/views/TodayPageLegacy'
import { TodayPageV2 } from '@/components/today/views/TodayPageV2'

export default async function TodayPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profileResult = await getAppProfile(userId)
  if (profileResult.status === 'unavailable') return <DataUnavailable />

  if (profileResult.status === 'missing') redirect('/onboarding')
  const profile = profileResult.profile

  const data = await loadTodayPageData(profile.id, profile.onboarding_completed_at)

  if (isTodayRestructureEnabled()) {
    return <TodayPageV2 data={data} />
  }

  return <TodayPageLegacy data={data} />
}
