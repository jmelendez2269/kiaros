import Link from 'next/link'
import { K, Kicker, MoonGlyph } from '@/components/almanac'
import { patternHref } from '@/lib/insights/home'
import { writtenUnderLine, type SkyStamp } from '@/lib/journal/sky-stamp'

const mono = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase' as const }

/** The sky above the entry, and a note when it is one the member has written under before. Names and counts only. */
export function JournalSkyStamp({ stamp, dateLabel }: { stamp: SkyStamp; dateLabel: string }) {
  const note = stamp.writtenUnder
  return (
    <div className="space-y-3">
      <div style={{ ...mono, color: K.inkDim, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <MoonGlyph phase={stamp.moonGlyphPhase} size={16} />
        <span>
          {stamp.moonPhase} · Moon in {stamp.moonSign}
          {stamp.retrogrades.length ? ` · ${stamp.retrogrades.join(', ')} retrograde` : ''}
        </span>
        <span style={{ marginLeft: 'auto' }}>{dateLabel}</span>
      </div>
      {note ? (
        <div style={{ borderRadius: 10, background: K.bg3, border: `1px solid ${K.violetDim}44`, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <span aria-hidden="true" style={{ fontFamily: K.fSerif, fontSize: 18, color: K.violetDim }}>{note.glyph}</span>
          <span style={{ flex: '1 1 240px', fontSize: 14, lineHeight: 1.55, color: K.ink }}>{writtenUnderLine(note)}</span>
          <Link href={patternHref(note.id)} style={{ ...mono, color: K.copperHi, textDecoration: 'none' }}>See the pattern →</Link>
        </div>
      ) : null}
    </div>
  )
}

export function JournalHeaderKicker() {
  return <Kicker color={K.stelloBlueSoft}>Journal</Kicker>
}
