'use client'

import { useState, useTransition } from 'react'
import { Frame, K, Kicker } from '@/components/almanac'
import { saveTodayCheckIn } from '@/app/(app)/today/actions'
import { CHECK_IN_MOODS, ENERGY_LEVELS, checkInSummary, type CheckIn } from '@/lib/today/check-in-options'

const label = { fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim } as const

function pill(active: boolean) {
  return {
    fontFamily: K.fBody,
    fontSize: 13,
    padding: '6px 12px',
    borderRadius: 999,
    border: `1px solid ${active ? '#A98AEF' : K.lineHi}`,
    background: active ? '#A98AEF' : 'transparent',
    color: active ? '#0A0C14' : K.ink,
    cursor: 'pointer',
  } as const
}

/**
 * Today's check-in: one energy level and one mood word, saved on tap. Tapping
 * the chosen one again clears it. It feeds look backs and Stelloquy; nothing
 * here is scored or counted.
 */
export function TodayCheckIn({ initial }: { initial: CheckIn }) {
  const [checkIn, setCheckIn] = useState<CheckIn>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save(next: CheckIn) {
    const previous = checkIn
    setCheckIn(next)
    setError(null)
    startTransition(async () => {
      const result = await saveTodayCheckIn(next)
      if (!result.ok) {
        setCheckIn(previous)
        setError(result.error)
      }
    })
  }

  const summary = checkInSummary(checkIn)

  return (
    <Frame tone="umber" padding={20}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Kicker color={K.violetDim} opacity={1}>How today is sitting</Kicker>
        <span role="status" style={{ fontSize: 12, color: K.inkDim }}>
          {pending ? 'Saving…' : summary ? `Noted · ${summary}` : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
        <div role="group" aria-label="Energy">
          <div style={label}>Energy</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {ENERGY_LEVELS.map((level) => {
              const active = checkIn.energy === level.value
              return (
                <button key={level.value} type="button" aria-pressed={active} style={pill(active)}
                  onClick={() => save({ ...checkIn, energy: active ? null : level.value })}>
                  {level.label}
                </button>
              )
            })}
          </div>
        </div>

        <div role="group" aria-label="Mood">
          <div style={label}>Mood</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {CHECK_IN_MOODS.map((mood) => {
              const active = checkIn.mood === mood
              return (
                <button key={mood} type="button" aria-pressed={active} style={pill(active)}
                  onClick={() => save({ ...checkIn, mood: active ? null : mood })}>
                  {mood}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, color: '#E8A0A0' }}>{error}</p>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: 12.5, lineHeight: 1.5, color: K.inkDim }}>
          Optional, and never scored. Your look backs and Stelloquy read it alongside the sky. Tap again to clear.
        </p>
      )}
    </Frame>
  )
}
