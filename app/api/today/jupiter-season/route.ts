import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId } from '@/lib/ai/usage'
import { getTodayContext } from '@/lib/today/get-today-context'
import { getJupiterSeason } from '@/lib/today/get-jupiter-season'
import { synthesizeJupiterSeason } from '@/lib/ai/jupiter-season-synthesis'

export const maxDuration = 60

// Generates (and caches) the /today Jupiter season read. Cached on
// user_settings keyed by "jupiter:{sign}:{year}" — only fires when
// Jupiter changes sign or year rolls over (~once a year).

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) {
      return NextResponse.json({ error: 'No profile' }, { status: 404 })
    }

    const date = getTodayContext().today.date
    const season = await getJupiterSeason(date, profileId)

    if (season.status !== 'ok') {
      return NextResponse.json({ read: null, signature: null })
    }

    if (season.cachedRead) {
      return NextResponse.json({ read: season.cachedRead, signature: season.signature })
    }

    const read = await synthesizeJupiterSeason({
      userProfileId: profileId,
      input: {
        sign: season.sign,
        degreeInSign: season.degreeInSign,
        isRetrograde: season.isRetrograde,
        activeAspects: season.activeAspects,
        hd: season.hd,
      },
    })

    const admin = createAdminSupabase()
    const { error } = await admin.from('user_settings').upsert(
      {
        user_id: profileId,
        jupiter_season_read: read,
        jupiter_season_signature: season.signature,
        jupiter_season_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) {
      console.error('[today/jupiter-season] cache persist failed:', error.message)
    }

    return NextResponse.json({ read, signature: season.signature })
  } catch (err) {
    console.error('[today/jupiter-season] failed:', err)
    return NextResponse.json({ error: 'Could not read the season' }, { status: 500 })
  }
}
