import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { K, Kicker } from '@/components/almanac'
import { PatternsUpgradeState } from '@/components/insights/PatternsUpgradeState'
import { StarChart } from '@/components/insights/StarChart'
import { requireOracleAccess } from '@/lib/commerce/access'
import { isIaJournalEnabled } from '@/lib/feature-flags'
import { todayISO } from '@/lib/today/get-today-context'
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: `Mind map — ${BRAND.product}`,
  description: 'Your themes, aspects, Human Design and moods from Stelloquy, charted as stars.',
}

/** Insights > Mind map: the capture graph as a star chart, on its own page. */
export default async function MindMapPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  // Built from Stelloquy conversations, so it needs Stelloquy access, like Patterns.
  if (await requireOracleAccess(userId)) return <PatternsUpgradeState />

  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6 md:p-8" style={{ color: K.ink }}>
      <header>
        <Kicker color={K.violetDim}>Insights · Mind map</Kicker>
        <h1 style={{ margin: '6px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 34, lineHeight: 1.15 }}>Your inner sky, charted</h1>
        <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.65, color: K.inkDim, maxWidth: 640 }}>
          Your themes sit near the centre as named stars. The outer band holds the four other kinds of tag Stelloquy notices:
          natal aspects, transit aspects, Human Design and moods. Brighter stars come up more often, and lines join things that
          came up in the same conversation.
        </p>
      </header>
      <StarChart today={todayISO()} patternsHref={isIaJournalEnabled() ? '/journal/patterns' : '/insights/map'} />
    </div>
  )
}
