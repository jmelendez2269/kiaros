'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { K, Kicker } from '@/components/almanac'
import { saveLineForToday, saveTodayCheckIn } from '@/app/(app)/today/actions'
import { PATTERN_DISCOVERY_CHECK_EVENT } from '@/lib/journal/pattern-discoveries'
import { CHECK_IN_MOODS, ENERGY_LEVELS, checkInSummary, type CheckIn } from '@/lib/today/check-in-options'

const mono = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim } as const
const prompt = { fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, lineHeight: 1.25, color: K.ink } as const

/**
 * Insights home, "Add to today's sky": the check-in and a line for today side
 * by side in one panel. Same saves as Today's cards, which stay as they are.
 * Both are optional, and nothing here is scored.
 */
export function AddToSkyPanel({ initial, rhythm = null, streak = 0, context }: {
  initial: CheckIn
  /** What earlier check-ins say about today's moon phase, shown once today's is noted. */
  rhythm?: string | null
  streak?: number
  /** e.g. "Saturn square your Moon overhead". */
  context?: string | null
}) {
  const [checkIn, setCheckIn] = useState<CheckIn>(initial)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [checkPending, startCheck] = useTransition()
  const [draft, setDraft] = useState('')
  const [streakNow, setStreakNow] = useState(streak)
  const [saved, setSaved] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [linePending, startLine] = useTransition()
  const flash = useRef<ReturnType<typeof setTimeout> | null>(null)

  function saveCheckIn(next: CheckIn) {
    const previous = checkIn
    setCheckIn(next)
    setCheckError(null)
    startCheck(async () => {
      const result = await saveTodayCheckIn(next)
      if (!result.ok) {
        setCheckIn(previous)
        setCheckError(result.error)
      }
    })
  }

  function saveLine() {
    if (!draft.trim() || linePending) return
    setLineError(null)
    startLine(async () => {
      const result = await saveLineForToday(draft, [])
      if (!result.ok) {
        setLineError(result.error)
        return
      }
      window.dispatchEvent(new Event(PATTERN_DISCOVERY_CHECK_EVENT))
      setDraft('')
      setStreakNow((s) => s + 1)
      setSaved(true)
      if (flash.current) clearTimeout(flash.current)
      flash.current = setTimeout(() => setSaved(false), 2400)
    })
  }

  const summary = checkInSummary(checkIn)
  const headline = [streakNow > 0 ? `${streakNow} ${streakNow === 1 ? 'day' : 'days'} running` : null, context ?? null].filter(Boolean).join(' · ')
  const dot = (active: boolean) => ({
    width: 44, height: 44, borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? K.copper : K.borderStrong}`, background: active ? K.copper : 'transparent', color: active ? K.bg : K.ink,
    fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 18,
  }) as const
  const pill = (active: boolean) => ({
    fontFamily: K.fBody, fontSize: 13.5, padding: '10px 14px', minHeight: 44, borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? K.copper : K.borderStrong}`, background: active ? K.copper : 'transparent', color: active ? K.bg : K.ink,
  }) as const

  return (
    <section aria-labelledby="add-to-sky" className="grid gap-5 rounded-2xl p-5 sm:p-6"
      style={{ border: `1px solid ${K.copper}66`, background: `linear-gradient(to right, ${K.copper}1a, transparent 70%), ${K.bg2}` }}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="add-to-sky" style={{ margin: 0, fontWeight: 400 }}><Kicker color={K.copperHi}>Add to today’s sky</Kicker></h2>
        <span style={mono}>{headline || 'Both are optional'}</span>
      </div>

      <div className="flex flex-wrap items-start gap-7">
        <div className="grid min-w-0 flex-[1_1_300px] gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span style={prompt}>How are you arriving today?</span>
            <span role="status" style={{ fontSize: 12, color: K.inkDim }}>{checkPending ? 'Saving…' : summary ? `Noted · ${summary}` : ''}</span>
          </div>
          <div role="group" aria-label="Energy" className="grid gap-2">
            <span style={{ fontSize: 13.5, color: K.inkDim }}>Energy</span>
            <div className="flex flex-wrap gap-1.5">
              {ENERGY_LEVELS.map((level) => {
                const active = checkIn.energy === level.value
                return (
                  <button key={level.value} type="button" aria-pressed={active} aria-label={`Energy ${level.value} of 5, ${level.label}`} title={level.label} style={dot(active)}
                    onClick={() => saveCheckIn({ ...checkIn, energy: active ? null : level.value })}>{level.value}</button>
                )
              })}
            </div>
          </div>
          <div role="group" aria-label="Mood" className="grid gap-2">
            <span style={{ fontSize: 13.5, color: K.inkDim }}>Mood</span>
            <div className="flex flex-wrap gap-1.5">
              {CHECK_IN_MOODS.map((mood) => {
                const active = checkIn.mood === mood
                return <button key={mood} type="button" aria-pressed={active} style={pill(active)} onClick={() => saveCheckIn({ ...checkIn, mood: active ? null : mood })}>{mood}</button>
              })}
            </div>
          </div>
          {rhythm && summary ? (
            <p style={{ margin: 0, paddingTop: 10, borderTop: `1px solid ${K.line}`, fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: K.ink }}>
              {rhythm}{' '}
              <Link href="/insights/map" style={{ fontFamily: K.fBody, fontStyle: 'normal', fontSize: 12.5, color: K.copperHi, textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap' }}>Under each moon →</Link>
            </p>
          ) : null}
          {checkError ? <p role="alert" style={{ margin: 0, fontSize: 13, color: '#E8A0A0' }}>{checkError}</p> : null}
        </div>

        <div className="grid min-w-0 flex-[1.3_1_340px] gap-3">
          <label htmlFor="line-home" style={prompt}>What did the day try to teach me?</label>
          <textarea id="line-home" rows={3} value={draft} disabled={linePending} placeholder="One line is enough."
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveLine() } }}
            style={{ boxSizing: 'border-box', width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${K.borderStrong}`, background: K.bg, color: K.ink, fontFamily: K.fSerif, fontSize: 18, lineHeight: 1.5, resize: 'vertical' }} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={saveLine} disabled={linePending || !draft.trim()}
              style={{ fontFamily: K.fBody, fontSize: 13.5, fontWeight: 500, color: K.bg, background: K.copperHi, border: 'none', borderRadius: 8, padding: '10px 18px', minHeight: 44, cursor: linePending || !draft.trim() ? 'not-allowed' : 'pointer', opacity: linePending || !draft.trim() ? 0.55 : 1 }}>
              {linePending ? 'Saving…' : 'Save line'}
            </button>
            <Link href="/journal" style={{ ...mono, textDecoration: 'none' }}>Write a full entry →</Link>
            {saved ? <span role="status" style={{ ...mono, color: K.sage }}>Saved · Stelloquy is listening</span> : null}
          </div>
          {lineError ? <p role="alert" style={{ margin: 0, fontSize: 13.5, color: K.brickHi }}>{lineError}</p> : null}
        </div>
      </div>
    </section>
  )
}
