import Link from 'next/link'
import { K, Kicker } from '@/components/almanac'
import type { SkyTurn } from '@/lib/sky-cycles/turns'

/**
 * The lasting record of a day the sky turned, shown on the Insights home
 * after the popup has been closed. Leads to Today, where the full read is.
 */
export function SkyTurnBand({ turns, headline, dateLabel }: { turns: SkyTurn[]; headline: string; dateLabel: string }) {
  if (turns.length === 0) return null
  return (
    <section aria-label="The sky turned today" className="flex flex-wrap items-center gap-5 rounded-2xl p-5 sm:p-6"
      style={{ border: `1px solid ${K.starlight}66`, background: `linear-gradient(to right, ${K.starlight}1f, ${K.copper}14 55%, transparent), ${K.bg2}`, color: K.ink }}>
      <div className="grid min-w-0 flex-1 gap-1.5" style={{ flexBasis: 360 }}>
        <Kicker color={K.starlight}>The sky turned today · {dateLabel}</Kicker>
        <p style={{ margin: 0, fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500, fontSize: 26, lineHeight: 1.15 }}>{headline}</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: K.inkDim }}>
          {turns.map((turn) => (turn.detail ? `${turn.title}, ${turn.detail}` : turn.title)).join(' · ')}
        </p>
      </div>
      <Link href="/today#in-the-sky" className="inline-flex items-center rounded-full px-5 text-sm font-medium"
        style={{ minHeight: 44, background: K.copperHi, color: K.bg, textDecoration: 'none' }}>
        See what turned →
      </Link>
    </section>
  )
}
