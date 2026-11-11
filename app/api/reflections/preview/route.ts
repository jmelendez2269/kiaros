import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { getUserProfileId } from '@/lib/ai/usage'
import type { PeriodReviewPeriod } from '@/lib/period-review/periods'
import { periodFor as reflectionPeriodFor } from '@/lib/reflections/periods'
import { lookBackWindow } from '@/lib/reflections/sky-window'
import { loadLookBackPreview } from '@/lib/period-review/preview'
import { todayISO } from '@/lib/today/get-today-context'

const querySchema = z.object({
  kind: z.enum(['week', 'month', 'quarter', 'year']),
  year: z.coerce.number().int().min(2000).max(2100),
  index: z.coerce.number().int().min(1).max(53),
})

/** The window a reflection covers. A year uses the whole calendar year; a week runs Monday to Sunday. */
function windowFor(kind: 'week' | 'month' | 'quarter' | 'year', year: number, index: number): PeriodReviewPeriod {
  return lookBackWindow(reflectionPeriodFor(kind, year, kind === 'quarter' ? Math.min(index, 4) : index, 'UTC'))
}

/** What a reflection will draw on, before it's prepared. No model call. */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    kind: url.searchParams.get('kind'),
    year: url.searchParams.get('year'),
    index: url.searchParams.get('index'),
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid period' }, { status: 400 })

  const profileId = await getUserProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let window: PeriodReviewPeriod
  try { window = windowFor(parsed.data.kind, parsed.data.year, parsed.data.index) }
  catch { return NextResponse.json({ error: 'Invalid period' }, { status: 400 }) }
  const today = todayISO()
  // A year under way is read as far as today; anything else waits until it has ended.
  if (parsed.data.kind === 'year' && window.periodStart <= today && window.periodEnd >= today) window = { ...window, periodEnd: today }
  else if (window.periodEnd >= today) {
    return NextResponse.json({ ended: false, preview: null })
  }
  const preview = await loadLookBackPreview(profileId, window, (sources) => ({
    ...sources,
    monthBlueprintTheme: null,
    quarterBlueprintTheme: null,
  }))
  return NextResponse.json({ ended: true, preview })
}
