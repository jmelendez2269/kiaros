import Link from 'next/link'
import { K, Kicker } from '@/components/almanac'
import type { EnergyType, WeekBlueprint } from '@/types/blueprint'

interface Props {
  weeks: WeekBlueprint[]
  currentWeekNumber: number
}

const RADIUS = 3

const ENERGY_TONE: Record<EnergyType, string> = {
  push: K.copper,
  initiate: K.ember,
  reflect: K.plum,
  rest: K.sage,
}

const ENERGY_LABEL: Record<EnergyType, string> = {
  push: 'Push',
  initiate: 'Initiate',
  reflect: 'Reflect',
  rest: 'Rest',
}

// Decorative proxy for energy type only — not a measured quantity.
const ENERGY_HEIGHT: Record<EnergyType, number> = {
  push: 88,
  initiate: 72,
  reflect: 56,
  rest: 38,
}

const ENERGY_ORDER: EnergyType[] = ['push', 'initiate', 'reflect', 'rest']

function rangeLabel(first: WeekBlueprint, last: WeekBlueprint): string {
  const start = new Date(`${first.startDate}T12:00:00`)
  const end = new Date(`${last.endDate}T12:00:00`)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} — ${end.toLocaleDateString('en-US', opts)}`
}

export function WeekArc({ weeks, currentWeekNumber }: Props) {
  const window = weeks.filter(
    (w) => w.weekNumber >= currentWeekNumber - RADIUS && w.weekNumber <= currentWeekNumber + RADIUS
  )
  if (window.length === 0) return null

  const current = weeks.find((w) => w.weekNumber === currentWeekNumber) ?? null

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <Kicker>Your week arc</Kicker>
        <div
          style={{
            fontFamily: K.fMono,
            fontSize: 11.5,
            color: K.inkSoft,
            letterSpacing: '0.14em',
          }}
        >
          {rangeLabel(window[0], window[window.length - 1]).toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        {window.map((w) => {
          const tone = ENERGY_TONE[w.energyType]
          const isCurrent = w.weekNumber === currentWeekNumber
          return (
            <Link
              key={w.weekNumber}
              href={`/year?view=week&date=${w.startDate}`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: ENERGY_HEIGHT[w.energyType],
                  borderRadius: '8px 8px 4px 4px',
                  background: `linear-gradient(180deg, ${tone}, ${tone}99)`,
                  border: isCurrent ? `1px solid ${K.ink}` : `1px solid ${tone}55`,
                  boxShadow: isCurrent ? `0 0 0 2px ${K.bg}, 0 0 0 3px ${tone}` : undefined,
                }}
              />
              <span
                style={{
                  fontFamily: K.fMono,
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: isCurrent ? K.ink : K.inkSoft,
                }}
              >
                W{w.weekNumber}
              </span>
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 14 }}>
        {ENERGY_ORDER.map((kind) => (
          <span
            key={kind}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: K.fMono,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: K.inkSoft,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: ENERGY_TONE[kind],
              }}
            />
            {ENERGY_LABEL[kind]}
          </span>
        ))}
      </div>

      {current ? (
        <p
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${K.line}`,
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 14.5,
            lineHeight: 1.6,
            color: K.starlight,
          }}
        >
          <strong style={{ fontStyle: 'normal', color: K.ink }}>{current.theme}.</strong>{' '}
          {current.cosmicContext}
        </p>
      ) : null}
    </div>
  )
}
