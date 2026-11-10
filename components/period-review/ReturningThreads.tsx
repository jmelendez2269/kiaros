import Link from 'next/link'
import { K } from '@/components/almanac'

const chip = {
  fontFamily: K.fMono,
  fontSize: 10.5,
  letterSpacing: '0.05em',
  color: '#C7B3F5',
  border: '1px solid rgba(169,138,239,0.45)',
  borderRadius: 999,
  padding: '4px 10px',
} as const

const link = { fontSize: 12.5, color: '#C7B3F5', textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap' } as const

function Row({ items, href, label, onNavigate }: { items: string[]; href: string; label: string; onNavigate?: () => void }) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {items.map((item) => <span key={item} style={chip}>{item}</span>)}
      <Link href={href} onClick={onNavigate} style={link}>{label} →</Link>
    </div>
  )
}

/**
 * Under a look back: skies and themes from this period that the member has
 * met before, each row leading to where the fuller picture lives.
 */
export function ReturningThreads({ patterns = [], themes = [], onNavigate }: { patterns?: string[]; themes?: string[]; /** e.g. close the modal this sits in. */ onNavigate?: () => void }) {
  if (!patterns.length && !themes.length) return null
  return (
    <section aria-label="Threads you have met before" style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontFamily: K.fMono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A4A3B1' }}>
        Threads you&apos;ve met before
      </div>
      <Row items={patterns} href="/insights/map" label="See in Patterns" onNavigate={onNavigate} />
      <Row items={themes} href="/insights/mind-map" label="See on your Mind map" onNavigate={onNavigate} />
    </section>
  )
}
