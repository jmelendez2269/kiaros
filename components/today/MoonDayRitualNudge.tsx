'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { MOON_DAY_NUDGE_COPY, type MoonDayNudgePhase } from '@/lib/today/moon-day-nudge-copy'
import {
  isMoonDayDismissed,
  MOON_DAY_NUDGE_LOCAL_STORAGE_KEY,
  moonDayDismissalKey,
  parseDismissalMap,
} from '@/lib/today/moon-day-phase'
import { moonDayRitualEntryHref } from '@/lib/today/moon-day-ritual-entry-href'

const VIOLET = '#A98AEF'
const INK = '#E3E2ED'
const MUTED = '#A4A3B1'

export type MoonDayNudgeViewState = 'hidden' | 'showing' | 'done' | 'dismissed'

export interface MoonDayRitualNudgeProps {
  phase: MoonDayNudgePhase
  localDate: string
  remindersEnabled: boolean
  serverDismissed: boolean
  ritualDone: boolean
  compactBody?: boolean
}

function readLocalDismissals(): Record<string, true> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(MOON_DAY_NUDGE_LOCAL_STORAGE_KEY)
    if (!raw) return {}
    return parseDismissalMap(JSON.parse(raw))
  } catch {
    return {}
  }
}

function writeLocalDismissal(key: string) {
  const current = readLocalDismissals()
  current[key] = true
  window.localStorage.setItem(MOON_DAY_NUDGE_LOCAL_STORAGE_KEY, JSON.stringify(current))
}

function PhaseGlyph({ phase }: { phase: MoonDayNudgePhase }) {
  const filled = phase === 'full'
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: `2px solid ${VIOLET}`,
          background: filled ? VIOLET : 'transparent',
          boxSizing: 'border-box',
        }}
      />
    </span>
  )
}

export function resolveMoonDayNudgeViewState(args: {
  phase: MoonDayNudgePhase | null
  remindersEnabled: boolean
  dismissed: boolean
  ritualDone: boolean
}): MoonDayNudgeViewState {
  if (!args.phase || !args.remindersEnabled) return 'hidden'
  if (args.dismissed) return 'dismissed'
  if (args.ritualDone) return 'done'
  return 'showing'
}

export function MoonDayRitualNudge({
  phase,
  localDate,
  remindersEnabled,
  serverDismissed,
  ritualDone,
  compactBody = false,
}: MoonDayRitualNudgeProps) {
  const copy = MOON_DAY_NUDGE_COPY[phase]
  const dismissalKey = moonDayDismissalKey(phase, localDate)
  const [localDismissed, setLocalDismissed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setLocalDismissed(isMoonDayDismissed(readLocalDismissals(), phase, localDate))
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [phase, localDate])

  const dismissed = serverDismissed || localDismissed
  const viewState = resolveMoonDayNudgeViewState({
    phase,
    remindersEnabled,
    dismissed,
    ritualDone,
  })

  const persistDismiss = useCallback(async () => {
    setLocalDismissed(true)
    writeLocalDismissal(dismissalKey)
    try {
      await fetch('/api/settings/moon-day-reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissKey: dismissalKey }),
      })
    } catch {
      // Local dismissal still holds for this device / moon day.
    }
  }, [dismissalKey])

  const bodyText = useMemo(() => {
    if (compactBody) {
      const firstSentence = copy.body.split(/(?<=[.!?])\s+/)[0] ?? copy.body
      return firstSentence
    }
    return copy.body
  }, [compactBody, copy.body])

  if (viewState === 'hidden' || viewState === 'dismissed') return null

  const fadeIn = reducedMotion ? undefined : 'moonDayNudgeFadeIn 150ms ease-out'

  if (viewState === 'done') {
    return (
      <div
        style={{
          marginBottom: 12,
          padding: '10px 16px',
          minHeight: 44,
          borderRadius: 12,
          border: `1px solid ${VIOLET}40`,
          background: `${VIOLET}1A`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: fadeIn,
        }}
      >
        <PhaseGlyph phase={phase} />
        <p style={{ margin: 0, fontSize: 15, color: MUTED, lineHeight: 1.4 }}>{copy.headline}</p>
      </div>
    )
  }

  return (
    <div
      className="moon-day-nudge"
      style={{
        marginBottom: 12,
        padding: '12px 16px',
        minHeight: 44,
        borderRadius: 12,
        border: `1px solid ${VIOLET}40`,
        background: `${VIOLET}1A`,
        animation: fadeIn,
      }}
    >
      <style>{`
        @keyframes moonDayNudgeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (min-width: 768px) {
          .moon-day-nudge .moon-day-nudge-headline { font-size: 16px; }
        }
        @media (max-width: 389px) {
          .moon-day-nudge-actions { flex-direction: column; align-items: stretch !important; }
          .moon-day-nudge-cta { width: 100%; text-align: center; }
        }
      `}</style>
      <div
        className="flex flex-wrap items-start gap-3"
        style={{ rowGap: 10 }}
      >
        <PhaseGlyph phase={phase} />
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <p
            className="moon-day-nudge-headline"
            style={{
              margin: 0,
              fontSize: 15,
              color: INK,
              lineHeight: 1.35,
              fontWeight: 500,
            }}
          >
            {copy.headline}
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 14,
              color: MUTED,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {bodyText}
          </p>
        </div>
        <div
          className="moon-day-nudge-actions flex shrink-0 items-center gap-1"
          style={{ marginLeft: 'auto' }}
        >
          <Link
            href={moonDayRitualEntryHref(phase)}
            className="moon-day-nudge-cta"
            style={{
              minHeight: 44,
              minWidth: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              fontSize: 14,
              fontWeight: 600,
              color: VIOLET,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {copy.cta}
          </Link>
          <button
            type="button"
            onClick={() => void persistDismiss()}
            aria-label={copy.dismiss}
            title={copy.dismiss}
            style={{
              minHeight: 44,
              minWidth: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: MUTED,
              cursor: 'pointer',
              borderRadius: 8,
            }}
          >
            <X size={20} aria-hidden />
            <span className="sr-only">{copy.dismiss}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
