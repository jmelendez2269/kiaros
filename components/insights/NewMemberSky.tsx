import Link from 'next/link'
import { K, Kicker, StarField } from '@/components/almanac'
import { BRAND } from '@/lib/brand'
import { isJournalConsentV2Enabled } from '@/lib/feature-flags'
import type { HomeSkyPattern } from '@/lib/insights/home'
import { firstPatternProgress, layoutNewMemberSky } from '@/lib/insights/new-member-sky'
import { patternGlyph, patternTitle } from '@/lib/insights/pattern-sky'
import { createServerSupabase } from '@/lib/supabase/server'

const serif = { fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500 } as const
const mono = { fontFamily: K.fMono, fontSize: 12, letterSpacing: 1.5 } as const
const card = { background: K.bg2, border: `1px solid ${K.line}`, color: K.ink } as const

/** Entries the member's patterns are built from: one star each. Read under their own access. */
async function countEntries(): Promise<number> {
  try {
    const supabase = await createServerSupabase()
    let query = supabase.from('journal_entries').select('id', { count: 'exact', head: true })
    if (isJournalConsentV2Enabled()) query = query.eq('include_in_insights', true)
    const { count, error } = await query
    return error ? 0 : count ?? 0
  } catch {
    return 0
  }
}

function sentence(have: number, of: number, hasEntries: boolean): string {
  if (!hasEntries) return 'Your first star arrives with your first line or entry.'
  const left = of - have
  return `${left === 1 ? 'One more' : `${left} more`} under this sky, and a pattern can start to show.`
}

/**
 * Insights home before a first pattern has formed: one star for each entry so
 * far, faint outlines where a pattern can form, and how far the sky written
 * under most is from becoming one. Names and counts only, so it reads the same
 * for members without Stelloquy access. Nothing here is a task.
 */
export async function NewMemberSky({ patterns, hasStelloquy }: { patterns: HomeSkyPattern[]; hasStelloquy: boolean }) {
  const entries = await countEntries()
  const strongest = [...patterns].sort((a, b) => b.count - a.count)[0]
  const progress = firstPatternProgress(patterns.map((p) => p.count), entries)
  const layout = layoutNewMemberSky(entries, progress.have)
  const first = layout.shared[0] ?? layout.ghosts[0]
  const label = entries === 0 ? 'Room for your first star' : entries === 1 ? 'Your first star' : `${entries} stars so far`
  const alt = `Your sky so far: ${entries === 0 ? 'no stars yet' : entries === 1 ? 'one star' : `${entries} stars`}, one for each entry. Faint outlines show where a pattern can form.`

  const items = [
    { kicker: 'Your first look back', title: 'Arrives when your first full week ends.', body: 'It reads the sky you moved through, and whatever you chose to share. A week with nothing written still gets its sky.' },
    { kicker: 'Your first pattern', title: `Forms once ${progress.of} entries share a sky.`, body: strongest && progress.have > 0 ? `You have ${progress.have} under ${patternTitle(strongest.type, strongest.key)}.` : 'Every line and entry is stamped with the sky above it. Several under the same one appear here as a constellation.', progress: true },
    ...(hasStelloquy ? [{ kicker: 'Your mind map', title: 'Begins with one saved moment.', body: `Save a moment from a ${BRAND.oracle} conversation and its themes begin to chart as stars.`, href: '/oracle', cta: 'Start a conversation' }] : []),
  ]

  return (
    <>
      <section aria-label="Your sky so far" className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${K.line}`, background: `radial-gradient(70% 110% at 32% 45%, #5a3eba33, transparent 60%), ${K.midnight}` }}>
        <StarField count={90} seed={7} opacity={0.4} />
        <svg viewBox="0 0 1000 340" role="img" aria-label={alt} style={{ position: 'relative', display: 'block', width: '100%', height: 'auto' }}>
          <polyline points="560,120 610,80 665,110 705,70" fill="none" stroke={K.ink} strokeOpacity={0.16} strokeDasharray="2 5" />
          <polyline points="760,230 815,265 875,225 925,260" fill="none" stroke={K.ink} strokeOpacity={0.16} strokeDasharray="2 5" />
          {first ? (
            <polyline points={[...layout.shared, ...layout.ghosts].map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={K.copper} strokeOpacity={0.45} strokeDasharray="2 5" />
          ) : null}
          {layout.ghosts.map((p, i) => <circle key={`g${i}`} cx={p.x} cy={p.y} r={3} fill="none" stroke={K.copper} strokeOpacity={0.6} />)}
          {layout.shared.map((p, i) => (
            <g key={`s${i}`}>
              {i === 0 ? <circle cx={p.x} cy={p.y} r={60} fill={K.copper} opacity={0.1} /> : null}
              {i === layout.shared.length - 1 ? <circle cx={p.x} cy={p.y} r={10} fill="none" stroke={K.copperHi} strokeOpacity={0.6} /> : null}
              <circle cx={p.x} cy={p.y} r={4.6} fill={K.ink} />
            </g>
          ))}
          {layout.loose.map((p, i) => <circle key={`l${i}`} cx={p.x} cy={p.y} r={3.4} fill={K.ink} opacity={0.85} />)}
          <text x={120} y={118} fill={K.ink} fontSize={20} fontFamily={K.fSerif} fontStyle="italic">{label}</text>
          {strongest && progress.have > 0 ? (
            <text x={120} y={136} fill={K.ink} fillOpacity={0.85} style={mono}>{`${patternGlyph(strongest.type, strongest.key)} ${patternTitle(strongest.type, strongest.key)}`.toUpperCase()}</text>
          ) : null}
          {first ? <text x={452} y={150} fill={K.ink} fillOpacity={0.85} style={mono}>{sentence(progress.have, progress.of, entries > 0).toUpperCase()}</text> : null}
          <text x={560} y={52} fill={K.ink} fillOpacity={0.85} style={mono}>ROOM FOR A SKY NOT YET WRITTEN UNDER</text>
        </svg>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <section key={item.kicker} className="flex flex-col gap-2 rounded-2xl p-5" style={card}>
            <Kicker color={K.violetDim}>{item.kicker}</Kicker>
            <p style={{ ...serif, margin: 0, fontSize: 21, lineHeight: 1.3 }}>{item.title}</p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: K.inkDim }}>{item.body}</p>
            {item.progress ? (
              <div role="img" aria-label={`${progress.have} of ${progress.of} entries`} className="mt-1 flex items-center gap-3">
                <span className="flex gap-1.5">
                  {Array.from({ length: progress.of }, (_, i) => (
                    <span key={i} aria-hidden style={{ width: 10, height: 10, boxSizing: 'border-box', borderRadius: 999, background: i < progress.have ? K.ink : 'transparent', border: i < progress.have ? 'none' : `1px solid ${K.inkDim}` }} />
                  ))}
                </span>
                <span style={{ fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim }}>{progress.have} of {progress.of} entries</span>
              </div>
            ) : null}
            {'href' in item ? (
              <Link href={item.href as string} className="mt-1 self-start text-sm underline underline-offset-4" style={{ color: K.copperHi }}>{item.cta} →</Link>
            ) : null}
          </section>
        ))}
      </div>
    </>
  )
}
