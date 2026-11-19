import Link from 'next/link'
import { K } from '@/components/almanac'
import { currentWeekNumber, howWeeksWentLabel, lastClosedWeek } from '@/lib/blueprint/year-strip'
import type { WeekBlueprint } from '@/types/blueprint'

const TONE: Record<string, string> = { push: K.copper, initiate: K.ember, reflect: K.plum, rest: K.sage }
const mono = { fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const }

/** The year at a glance: one bar per week, coloured by its energy, today marked, and the way into Reviews. */
export function BlueprintYearStrip({ weeks, planYear, today }: { weeks: WeekBlueprint[]; planYear: number; today: string }) {
  if (weeks.length === 0) return null
  const now = currentWeekNumber(weeks, today)
  const closedLabel = howWeeksWentLabel(lastClosedWeek(weeks, today))
  return (
    <section aria-label="The year at a glance" className="shell-panel px-6 py-5">
      <div style={{ ...mono, color: K.inkDim, marginBottom: 10 }}>The year at a glance · {planYear}</div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 34 }} role="img" aria-label={`${weeks.length} weeks, coloured by energy`}>
        {weeks.map((w) => (
          <span
            key={w.weekNumber}
            title={`Week ${w.weekNumber} · ${w.energyType}`}
            style={{ flex: 1, minWidth: 2, height: w.weekNumber === now ? 34 : 20, borderRadius: 2, background: TONE[w.energyType] ?? K.inkSoft, opacity: w.weekNumber === now ? 1 : 0.55 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10, ...mono, color: K.inkDim }}>
        {Object.entries(TONE).map(([name, color]) => (
          <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{name}</span>
        ))}
      </div>
      {closedLabel ? (
        <Link href={`/reviews?year=${planYear}`} style={{ ...mono, display: 'inline-block', marginTop: 14, color: K.copperHi, textDecoration: 'none' }}>
          {closedLabel}
        </Link>
      ) : null}
    </section>
  )
}
