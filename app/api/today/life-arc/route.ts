import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId } from '@/lib/ai/usage'
import { getTodayContext } from '@/lib/today/get-today-context'
import { getLifeArc } from '@/lib/today/get-life-arc'
import { synthesizeLifeArc } from '@/lib/ai/life-arc-synthesis'

export const maxDuration = 60

// Generates (and caches) the /today "life arc" read. The card renders its
// deterministic headline immediately; when no cached AI prose matches the
// live heavy-window signature, the client POSTs here to fill it in. The
// read is persisted on user_settings (season_read / season_read_signature)
// keyed by signature, so this only does model work when the configuration
// has actually changed.

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
    const arc = await getLifeArc(date, profileId)

    if (arc.status !== 'ok') {
      return NextResponse.json({ read: null, signature: null })
    }

    if (arc.cachedRead) {
      return NextResponse.json({ read: arc.cachedRead, signature: arc.signature })
    }

    const read = await synthesizeLifeArc({
      userProfileId: profileId,
      input: {
        onceInLifetimeCount: arc.onceInLifetimeCount,
        rareCount: arc.rareCount,
        heavy: arc.heavy,
        hd: arc.hd,
      },
    })

    const admin = createAdminSupabase()
    const { error } = await admin.from('user_settings').upsert(
      {
        user_id: profileId,
        season_read: read,
        season_read_signature: arc.signature,
        season_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) {
      console.error('[today/life-arc] cache persist failed:', error.message)
    }

    return NextResponse.json({ read, signature: arc.signature })
  } catch (err) {
    console.error('[today/life-arc] failed:', err)
    return NextResponse.json({ error: 'Could not read the arc' }, { status: 500 })
  }
}
