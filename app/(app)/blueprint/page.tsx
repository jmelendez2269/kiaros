import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { BlueprintView } from '@/components/blueprint/BlueprintView'
import { getAppProfile, appProfileId } from '@/lib/app/get-app-profile'
import { getAccessWindow } from '@/lib/commerce/get-access-window'
import { currentBlueprintRowExists, loadCurrentBlueprint } from '@/lib/blueprint/load'
import type { Tradition } from '@/types/blueprint'

const TRADITION_LABELS: Record<Tradition, string> = {
  evolutionary: 'Evolutionary Astrology',
  karmic: 'Karmic Astrology',
  psychological: 'Psychological Astrology',
  traditional: 'Traditional / Hellenistic',
  synthesis: 'Synthesis',
}

export default async function BlueprintPage() {
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()

  const { userId } = await auth()
  const [clerkUser, appProfile] = await Promise.all([
    currentUser(),
    userId ? getAppProfile(userId) : Promise.resolve(null),
  ])
  const isAdmin = clerkUser?.publicMetadata?.isAdmin === true
  const appProfileUserId = appProfileId(appProfile)

  const [loaded, accessWindow, { data: profile }] = await Promise.all([
    appProfileUserId ? loadCurrentBlueprint(appProfileUserId, isAdmin) : Promise.resolve(null),
    appProfileUserId ? getAccessWindow(appProfileUserId) : Promise.resolve(null),
    supabase
      .from('user_profiles')
      .select('tradition, house_system')
      .maybeSingle(),
  ])

  const needsRegeneration =
    !!loaded &&
    !!profile &&
    (
      (profile.tradition !== null && loaded.tradition !== profile.tradition) ||
      (profile.house_system !== null && loaded.houseSystem !== profile.house_system)
    )

  const currentTradition = profile?.tradition as Tradition | null

  if (!loaded) {
    // loadCurrentBlueprint() returns null both when nothing was ever
    // generated and when a Blueprint exists but the caller's access
    // capability is 'none' (ACCESS-02) — those need different messaging.
    const rowExists = appProfileUserId ? await currentBlueprintRowExists(appProfileUserId) : false

    if (rowExists) {
      return (
        <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
          <div className="text-4xl text-bone-muted">✦</div>
          <h1 className="font-serif text-3xl text-bone">Your {currentYear} Blueprint is locked</h1>
          <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
            Your year plan exists, but your current access doesn&apos;t cover it right now.
            Upgrade to reopen it.
          </p>
          <Link
            href="/pricing"
            className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
          >
            See plans
          </Link>
        </div>
      )
    }

    return (
      <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
        <div className="text-4xl text-bone-muted">✦</div>
        <h1 className="font-serif text-3xl text-bone">No blueprint yet</h1>
        <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
          Your {currentYear} blueprint hasn&apos;t been generated. Complete onboarding to create
          your personalised year plan grounded in your natal chart and real planetary transits.
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

  return (
    <>
      {needsRegeneration && (
        <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-leather-400/40 bg-leather-500/15 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-bone">
                {loaded.tradition === null
                  ? 'Tradition-aware readings are now available'
                  : 'Your tradition or house system has changed'}
              </p>
              <p className="text-xs leading-relaxed text-bone-muted">
                {loaded.tradition === null
                  ? `Regenerate your blueprint to weave in your ${currentTradition ? TRADITION_LABELS[currentTradition] : 'chosen tradition'} lens.`
                  : `Regenerate your blueprint to reflect your ${currentTradition ? TRADITION_LABELS[currentTradition] : 'updated'} path.`}
              </p>
            </div>
            <Link
              href="/onboarding/generating"
              className="shrink-0 rounded-xl border border-leather-400/50 bg-leather-500/30 px-4 py-2 text-sm font-medium text-bone shadow-glow hover:bg-leather-500/45"
            >
              Regenerate
            </Link>
          </div>
        </div>
      )}
      <BlueprintView
        blueprint={loaded.blueprint}
        planYear={loaded.planYear}
        accessEndsAt={accessWindow?.endsAt ?? null}
        accessState={accessWindow?.state ?? null}
        capability={loaded.access}
      />
    </>
  )
}
