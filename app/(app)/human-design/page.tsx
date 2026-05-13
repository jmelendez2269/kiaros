import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { auth } from '@clerk/nextjs/server'
import {
  computeHumanDesign,
  isHumanDesignStale,
  parseStoredHumanDesign,
  type HumanDesignBirthInput,
  type HumanDesignChart,
} from '@/lib/human-design'
import { HumanDesignView } from '@/components/human-design/HumanDesignView'

export default async function HumanDesignPage() {
  const { userId } = await auth()
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'display_name, birth_date, birth_time, birth_time_unknown, birth_city, birth_tz, birth_lat, birth_lng, human_design',
    )
    .maybeSingle()

  if (!profile?.birth_date || profile.birth_lat == null || profile.birth_lng == null) {
    return <NoBirthDataState />
  }

  const birthInput: HumanDesignBirthInput = {
    birth_date: profile.birth_date,
    birth_time: profile.birth_time,
    birth_time_unknown: profile.birth_time_unknown,
    birth_tz: profile.birth_tz,
    birth_lat: profile.birth_lat,
    birth_lng: profile.birth_lng,
  }

  // Human Design with an unknown birth time is unreliable — gates change
  // every ~16 minutes. Hide the chart and explain why rather than show
  // something the user might quote back to us as "their" Type / Profile.
  if (profile.birth_time_unknown || !profile.birth_time) {
    return <UnknownTimeState />
  }

  let chart: HumanDesignChart | null = parseStoredHumanDesign(profile.human_design)

  if (!chart || isHumanDesignStale(profile.human_design)) {
    chart = computeHumanDesign(birthInput)
    if (chart && userId) {
      // Backfill on read so the next visit is a pure DB fetch. Best-effort —
      // ignore failures here; the page still renders the freshly computed
      // chart even if the persist round-trip fails.
      try {
        const admin = createAdminSupabase()
        await admin
          .from('user_profiles')
          .update({ human_design: chart as unknown as Record<string, unknown> })
          .eq('clerk_user_id', userId)
      } catch (err) {
        console.error('[human-design] backfill persist failed:', err)
      }
    }
  }

  if (!chart) {
    return <NoBirthDataState />
  }

  return (
    <HumanDesignView
      chart={chart}
      displayName={profile.display_name}
      birthCity={profile.birth_city}
    />
  )
}

function NoBirthDataState() {
  return (
    <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
      <div className="text-4xl text-bone-muted">⌖</div>
      <h1 className="font-serif text-3xl text-bone">Your chart needs birth data</h1>
      <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
        Human Design is computed from the moment and place of your birth. Finish onboarding so
        your chart can be drawn from real ephemeris data, not a generic template.
      </p>
      <Link
        href="/onboarding"
        className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
      >
        Complete Setup
      </Link>
    </div>
  )
}

function UnknownTimeState() {
  return (
    <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
      <div className="text-4xl text-bone-muted">⌖</div>
      <h1 className="font-serif text-3xl text-bone">Birth time needed for Human Design</h1>
      <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
        Human Design gates shift every ~16 minutes. Without a known birth time, the chart would
        be a guess — so Kiaros doesn&apos;t show one. If you can find your time of birth (a
        birth certificate, hospital record, or a parent&apos;s memory), add it in settings and
        the chart will appear.
      </p>
      <Link
        href="/settings"
        className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
      >
        Update birth time
      </Link>
    </div>
  )
}
