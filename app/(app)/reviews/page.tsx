import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { SkyCyclesYearList } from '@/components/sky-cycles/SkyCyclesYearList'
import { todayISO } from '@/lib/today/get-today-context'
import { Frame, K, Kicker } from '@/components/almanac'
import { ReviewsTimeline } from '@/components/reviews/ReviewsTimeline'
import { loadYearTimeline, timelineYears } from '@/lib/reviews/load-year-timeline'
import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import { periodReviewPublicFlagEnabled } from '@/lib/period-review/flag'
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: `Reviews — ${BRAND.product}`,
  description: 'Look back on each week, month and quarter: the sky, your plans, and your own words.',
}

const OTHER_LINKS = [
  {
    href: '/year?view=review',
    label: 'Quarterly check-ins',
    hint: 'your own wins, challenges and pivots, quarter by quarter',
  },
  {
    href: '/year/unwrapped',
    label: 'Yearly Unwrapped',
    hint: 'the story of your whole year',
  },
  {
    href: '/reflections?kind=week',
    label: 'Weekly reflections',
    hint: 'every week since you joined, read from the sky and whatever you shared',
  },
  {
    href: '/reflections',
    label: 'Monthly and quarterly reflections',
    hint: 'the longer written reflections, with space for your own perspective',
  },
] as const

/**
 * Insights > Reviews: one place to open any month or quarter look back,
 * instead of waiting for the Today card in the week after a period ends.
 */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>
}) {
  // The chips open the review modal, which only mounts with the public flag.
  if (!isPeriodReviewEnabled() || !periodReviewPublicFlagEnabled()) redirect('/reflections')

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const profileResult = await getAppProfile(userId)
  const profileId = profileResult.status === 'ok' ? profileResult.profile.id : null

  const today = todayISO()
  const params = (await searchParams) ?? {}
  const rawYear = Number(Array.isArray(params.year) ? params.year[0] : params.year)
  const years = profileId ? await timelineYears(profileId, today) : [Number(today.slice(0, 4))]
  const year = years.includes(rawYear) ? rawYear : years[years.length - 1]
  const timeline = profileId ? await loadYearTimeline(profileId, year, today, years).catch((error) => {
    console.error('[reviews] year timeline unavailable:', error)
    return null
  }) : null

  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6 md:p-8" style={{ color: K.ink }}>
      <header>
        <Kicker color={K.violetDim}>Insights</Kicker>
        <h1
          style={{ margin: '6px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 32, lineHeight: 1.15 }}
        >
          Reviews
        </h1>
        <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.65, color: K.inkDim, maxWidth: 560 }}>
          Your whole year on one line: every week, month and quarter you can look back on once it ends, the sky
          you moved through, and your Unwrapped waiting at the end. A stretch with nothing written is still read.
        </p>
      </header>

      {timeline ? (
        <ReviewsTimeline key={year} timeline={timeline} />
      ) : (
        <Frame tone="umber" padding={20}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: K.inkDim }}>
            Your year could not be loaded just now. Please refresh in a moment.
          </p>
        </Frame>
      )}

      {profileId ? (
        <Frame tone="umber" padding={20}>
          <SkyCyclesYearList profileId={profileId} today={today} />
        </Frame>
      ) : null}

      <Frame tone="umber" padding={20}>
        <Kicker color={K.copper}>More ways to look back</Kicker>
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 12 }}>
          {OTHER_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} style={{ color: K.copperHi, textDecoration: 'underline', textUnderlineOffset: 3, fontSize: 15 }}>
                {link.label}
              </Link>
              <div style={{ fontSize: 13, color: K.inkDim, marginTop: 2 }}>{link.hint}</div>
            </li>
          ))}
        </ul>
      </Frame>
    </div>
  )
}
