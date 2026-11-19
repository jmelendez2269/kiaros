import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { Frame, K, Kicker } from '@/components/almanac'
import { DataUnavailable } from '@/components/shared/DataUnavailable'
import { GoalReview } from '@/components/look-ahead/GoalReview'
import { YearSkyView } from '@/components/look-ahead/YearSkyView'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { isLookAheadMember, loadGoalReview, loadYearSky } from '@/lib/look-ahead/load'
import { lookAheadDateISO, lookAheadWindowAt } from '@/lib/look-ahead/window'
import { shortDate } from '@/lib/sky-cycles/detect'
import { isMockTodayDateAllowed, MOCK_TODAY_QUERY_PARAM, parseMockTodayDateParam } from '@/lib/today/mock-today-date'
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: `Looking ahead — ${BRAND.product}`,
  description: 'The sky of next year over your chart, and the goals you carry, reshape or release.',
}

const serif = { fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500 } as const
const dim = { fontSize: 15.5, lineHeight: 1.65, color: K.inkDim } as const

function Closed({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-3 p-4 sm:p-6 md:p-8" style={{ color: K.ink }}>
      <Kicker color={K.ember}>Looking ahead</Kicker>
      <h1 style={{ ...serif, margin: 0, fontSize: 38, lineHeight: 1.1 }}>{title}</h1>
      <p style={{ ...dim, margin: 0 }}>{body}</p>
      <Link href={href} className="self-start text-sm underline underline-offset-4" style={{ color: K.copperHi }}>{cta} →</Link>
    </div>
  )
}

/** From Nov 1 to Nov 30: the next planner year's sky over the member's chart, and the goal review. */
export default async function LookAheadPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const profileResult = await getAppProfile(userId)
  if (profileResult.status === 'unavailable') return <DataUnavailable />
  if (profileResult.status !== 'ok') redirect('/today')
  const profileId = profileResult.profile.id

  // Previews can set ?mockToday=YYYY-MM-DD, as on Today and Insights; production ignores it.
  const rawMock = ((await searchParams) ?? {})[MOCK_TODAY_QUERY_PARAM]
  const mockToday = isMockTodayDateAllowed() ? parseMockTodayDateParam(Array.isArray(rawMock) ? rawMock[0] : rawMock) : null
  const window = lookAheadWindowAt({ mockToday })

  if (!window.open || window.year === null) {
    return (
      <Closed
        title={`${window.currentPlannerYear} is your planner year`}
        body={`Each year, from November 1, the next year opens to look into: its sky over your chart, and a second look at your goals. Until then, ${window.currentPlannerYear} is where your planner lives.`}
        href="/blueprint"
        cta={`Open your ${window.currentPlannerYear} Blueprint`}
      />
    )
  }
  const year = window.year

  if (!(await isLookAheadMember(profileId))) {
    return (
      <Closed
        title={`${year} opens with an active membership`}
        body={`Looking into ${year} is part of an active monthly or yearly membership. Everything you have already written stays yours to read.`}
        href="/settings"
        cta="See your membership"
      />
    )
  }

  let review
  let sky
  try {
    review = await loadGoalReview(profileId, year)
    sky = await loadYearSky(profileId, year, review.goals)
  } catch {
    return <DataUnavailable />
  }

  const current = window.currentPlannerYear
  const turns = [
    { date: window.opensOn as string, line: `${year} opens to look into.` },
    { date: window.rollsOn as string, line: `${year} becomes your current planner year.` },
    { date: `${current}-12-31`, line: `Your last quarter review and the yearly reflection for ${current}.` },
  ]
  const todayISO = mockToday ?? lookAheadDateISO()

  return (
    <div className="mx-auto grid max-w-[1080px] gap-[22px] p-4 sm:p-6 md:p-9" style={{ color: K.ink }}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid max-w-[640px] gap-2">
          <Kicker color={K.ember}>Blueprint · looking ahead</Kicker>
          <h1 style={{ ...serif, margin: 0, fontSize: 42, lineHeight: 1.08 }}>Begin {year} when you’re ready</h1>
          <p style={{ ...dim, margin: 0 }}>
            Your {current} stays exactly where it is, and stays your current year until December 1. This is a place to look, and to start shaping what comes with you.
          </p>
        </div>
        <nav aria-label="Year" className="flex gap-1 rounded-full p-1" style={{ background: K.bg3, border: `1px solid ${K.line}` }}>
          <Link href="/blueprint" className="inline-flex items-center rounded-full px-[18px] text-sm"
            style={{ minHeight: 44, color: K.inkDim, textDecoration: 'none' }}>
            {current}
          </Link>
          <span aria-current="page" className="inline-flex items-center rounded-full px-[18px] text-sm" style={{ minHeight: 44, background: K.bg4, color: K.ink }}>
            {year}
          </span>
        </nav>
      </header>

      <YearSkyView sky={sky} />

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0" style={{ flex: '1.2 1 440px' }}>
          <GoalReview review={review} mockToday={mockToday} />
        </div>
        <div className="min-w-0" style={{ flex: '1 1 340px' }}>
          <Frame>
            <div className="flex flex-col gap-1">
              <Kicker color={K.violetDim}>The turn of the year</Kicker>
              {turns.map((t, i) => {
                const here = todayISO >= t.date && (i === turns.length - 1 || todayISO < turns[i + 1].date)
                return (
                  <div key={t.date} className="flex items-baseline gap-3.5 py-3" style={{ borderBottom: i < turns.length - 1 ? `1px solid ${K.line}` : 'none' }}>
                    <span style={{ flex: 'none', width: 58, fontFamily: K.fMono, fontSize: 11, letterSpacing: '0.12em', color: here ? K.copperHi : K.inkDim }}>
                      {shortDate(t.date).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>{t.line}{here ? ' You are here.' : ''}</span>
                  </div>
                )
              })}
            </div>
          </Frame>
        </div>
      </div>
    </div>
  )
}
