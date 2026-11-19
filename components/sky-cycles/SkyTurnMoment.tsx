'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUser } from '@clerk/nextjs'
import { K } from '@/components/almanac'
import { isSkyTurnOff, isSkyTurnSeen, markSkyTurnSeen, SKY_TURN_OPEN_EVENT, turnSkyTurnOff } from '@/lib/sky-cycles/turn-storage'
import type { SkyTurn } from '@/lib/sky-cycles/turns'

const mono = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase' } as const
const primary = {
  display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', borderRadius: 999, border: 'none',
  background: K.copperHi, color: K.bg, fontFamily: K.fBody, fontSize: 14.5, fontWeight: 500, cursor: 'pointer', textDecoration: 'none',
} as const
const quiet = {
  minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${K.borderStrong}`, background: 'transparent',
  color: K.ink, fontFamily: K.fBody, fontSize: 14, cursor: 'pointer',
} as const

/**
 * Opens by itself once, the first time a member opens the app on a day the
 * sky turns (a planet stations, an eclipse, a slow sign change, an exact
 * transit to their chart). It names what turned and points to Today, where the
 * full read lives. Seen and "off" are remembered in this browser.
 */
export function SkyTurnMoment({ turns, headline, today, dateLabel, onToday = false }: {
  turns: SkyTurn[]
  headline: string
  /** The member's calendar day, YYYY-MM-DD. */
  today: string
  /** e.g. "Fri 13 Nov". */
  dateLabel: string
  /** True on the Today page, where the full read can open in place. */
  onToday?: boolean
}) {
  const { isLoaded, user } = useUser()
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const tried = useRef(false)
  const userId = user?.id ?? null
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (tried.current || !isLoaded) return
    tried.current = true
    if (!userId || turns.length === 0) return
    if (isSkyTurnOff(userId) || isSkyTurnSeen(userId, today)) return
    // Marked when it opens, so closing it or leaving never brings it back that day.
    markSkyTurnSeen(userId, today)
    setOpen(true)
  }, [isLoaded, userId, turns.length, today])

  useEffect(() => {
    if (!open) return
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, close])

  if (!open || typeof document === 'undefined') return null

  const readInPlace = () => {
    close()
    window.dispatchEvent(new CustomEvent(SKY_TURN_OPEN_EVENT, { detail: { cycleId: turns[0]?.cycleId ?? '' } }))
  }
  const switchOff = () => {
    if (userId) turnSkyTurnOff(userId)
    close()
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 75, display: 'flex', justifyContent: 'center', padding: 16 }}>
      <button type="button" aria-label="Close" onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,20,0.82)', border: 'none', cursor: 'default' }} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{
          position: 'relative', margin: 'auto', width: '100%', maxWidth: 540, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto',
          background: `radial-gradient(90% 60% at 50% 0%, ${K.brick}40, transparent 70%), ${K.bg2}`,
          border: `1px solid ${K.lineHi}`, borderRadius: 20, padding: '28px 26px 22px', color: K.ink, fontFamily: K.fBody,
          boxShadow: `0 20px 80px ${K.stelloBlueDeep}66`,
        }}>
        <div style={{ ...mono, color: K.starlight }}>{dateLabel} · the sky turned</div>
        <h2 id={titleId} ref={titleRef} tabIndex={-1}
          style={{ margin: '12px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500, fontSize: 32, lineHeight: 1.12, outline: 'none' }}>
          {headline}
        </h2>

        <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0 }}>
          {turns.map((turn) => (
            <li key={turn.id} style={{ padding: '13px 0', borderTop: `1px solid ${K.line}` }}>
              <div style={{ fontSize: 15.5 }}>{turn.title}</div>
              {turn.detail ? <div style={{ marginTop: 3, fontSize: 13, color: K.inkDim }}>{turn.detail}</div> : null}
            </li>
          ))}
        </ul>

        <p style={{ margin: '4px 0 0', paddingTop: 14, borderTop: `1px solid ${K.line}`, fontSize: 14.5, lineHeight: 1.6, color: K.inkDim }}>
          Nothing is asked of you. Today holds the fuller read, and what you have written under this sky before.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 18 }}>
          {onToday ? (
            <button type="button" onClick={readInPlace} style={primary}>Read it in full →</button>
          ) : (
            <Link href="/today#in-the-sky" onClick={close} style={primary}>Open Today →</Link>
          )}
          <button type="button" onClick={close} style={quiet}>Later</button>
        </div>

        <p style={{ margin: '16px 0 0', fontSize: 12.5, lineHeight: 1.5, color: K.inkDim }}>
          Shown once, only on days the sky turns.{' '}
          <button type="button" onClick={switchOff}
            style={{ background: 'none', border: 'none', padding: '6px 0', color: K.copperHi, fontFamily: K.fBody, fontSize: 12.5, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
            Stop showing these on this device
          </button>
        </p>
      </div>
    </div>,
    document.body,
  )
}
