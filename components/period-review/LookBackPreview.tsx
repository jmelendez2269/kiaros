'use client'

import { K } from '@/components/almanac'
import type { PeriodReviewSourceChips } from '@/lib/period-review/report-schema'

const GROUPS: Array<{ key: keyof PeriodReviewSourceChips; label: string }> = [
  { key: 'journal', label: 'Your journal' },
  { key: 'plans', label: 'Your plans and check-ins' },
  { key: 'sky', label: 'The sky' },
]

/**
 * Shown before a look back is written: what it will draw on, using the same
 * source chips the finished review shows.
 */
export function LookBackPreview({ chips, periodNoun }: { chips: PeriodReviewSourceChips; periodNoun: string }) {
  const groups = GROUPS.map((g) => ({ ...g, items: chips[g.key] ?? [] }))
  const hasAny = groups.some((g) => g.items.length > 0)
  const journalEmpty = (chips.journal ?? []).length === 0

  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 18,
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid rgba(164,163,177,0.25)',
        background: '#11141f',
      }}
    >
      <div style={{ fontFamily: K.fMono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A4A3B1' }}>
        What we&apos;ll gather
      </div>
      {hasAny ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {groups.map((g) => (
            <div key={g.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: K.ink, minWidth: 170 }}>{g.label}</span>
              {g.items.length > 0 ? (
                g.items.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontFamily: K.fMono,
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      color: '#C7B3F5',
                      border: '1px solid rgba(169,138,239,0.45)',
                      borderRadius: 999,
                      padding: '4px 10px',
                    }}
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 12.5, color: '#A4A3B1', fontStyle: 'italic' }}>nothing this {periodNoun}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#A4A3B1' }}>
          A quiet {periodNoun} in the app. This look back will lean on the sky.
        </p>
      )}
      {hasAny && journalEmpty ? (
        <p style={{ margin: '12px 0 0', fontSize: 12.5, lineHeight: 1.6, color: '#A4A3B1' }}>
          Only entries you&apos;ve included are counted. Private entries stay out of it.
        </p>
      ) : null}
    </div>
  )
}
