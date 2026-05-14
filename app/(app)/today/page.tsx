import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getDailyLongitudesForDate } from '@/lib/ephemeris'
import { Frame, K } from '@/components/almanac'
import { getTodayContext } from '@/lib/today/get-today-context'
import { getShapeOfToday } from '@/lib/today/shape-of-today'
import { SkyBanner } from '@/components/today/SkyBanner'
import { ShapeOfTodayCards } from '@/components/today/ShapeOfToday'
import { WeekRibbon } from '@/components/today/WeekRibbon'
import { MiniEphemeris } from '@/components/today/MiniEphemeris'
import { LineForToday } from '@/components/today/LineForToday'

export default async function TodayPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServerSupabase()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, first_name')
    .maybeSingle()

  const context = getTodayContext()
  const shape = getShapeOfToday({
    moonPhase: context.today.moonPhase,
    moonSign: context.today.moon.sign,
  })
  const transit = getDailyLongitudesForDate(context.today.date)

  return (
    <div
      style={{
        fontFamily: K.fBody,
        color: K.ink,
        background: K.bg,
        backgroundImage: `radial-gradient(ellipse at top, ${K.brick}26 0%, transparent 40%), radial-gradient(ellipse at bottom right, ${K.kairos}14 0%, transparent 50%)`,
        minHeight: '100%',
        padding: 28,
        display: 'grid',
        gap: 18,
      }}
    >
      <SkyBanner context={context} firstName={profile?.first_name ?? null} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        <Frame tone="umber" padding={22}>
          <ShapeOfTodayCards
            shape={shape}
            isoWeek={context.meta.isoWeek}
            dayOfYear={context.meta.dayOfYear}
          />
        </Frame>
        <Frame tone="cocoa" padding={20} stars>
          <MiniEphemeris transit={transit} natal={null} />
        </Frame>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        <Frame tone="umber" padding={20}>
          <WeekRibbon week={context.week} />
        </Frame>
        <LineForToday />
      </div>
    </div>
  )
}
