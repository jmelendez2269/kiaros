import Link from 'next/link'
import { K, StarField } from '@/components/almanac'
import { shortDay, type TimelineUnwrapped } from '@/lib/reviews/year-timeline'

const mono = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim } as const

/** The yearly reflection at the end of Reviews: waiting while the year runs, then ready to read. */
export function YearlyReflectionBanner({ year, unwrapped }: { year: number; unwrapped: TimelineUnwrapped }) {
  const waiting = unwrapped.state === 'waiting'
  return (
    <section aria-label="Yearly reflection" className="relative flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-2xl p-7"
      style={{ border: `1px solid ${K.line}`, background: `radial-gradient(80% 140% at 20% 0%, #5a3eba33, transparent 65%), ${K.midnight}` }}>
      <StarField count={28} seed={3} opacity={0.55} />
      <div className="relative grid max-w-xl gap-2 rounded-2xl p-5" style={{ background: '#080a11b3' }}>
        <span style={mono}>Yearly reflection · {year}</span>
        <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500, fontSize: 32, lineHeight: 1.15 }}>
          {waiting ? 'the whole year, told once it has closed.' : `your ${year}, told once.`}
        </span>
        <span style={{ fontSize: 14, lineHeight: 1.6, color: K.inkDim }}>
          {waiting
            ? `Story, full report and a card to share. It gathers itself from these look backs when the year ends, on ${shortDay(unwrapped.opensOn)}.`
            : unwrapped.state === 'ready' ? 'Your year has ended. Its story is ready to prepare.' : 'Your year’s story is waiting to be read again.'}
        </span>
      </div>
      {!waiting ? (
        <Link href="/year/unwrapped" className="relative rounded-full px-5 py-3 text-sm" style={{ background: K.copperHi, color: K.bg }}>Open {year} Unwrapped →</Link>
      ) : null}
    </section>
  )
}
