'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MOON_DAY_NUDGE_COPY, type MoonDayNudgePhase } from '@/lib/today/moon-day-nudge-copy'
import { isMoonDayDismissed, moonDayDismissalKey } from '@/lib/today/moon-day-phase'
import { moonDayRitualEntryHref } from '@/lib/today/moon-day-ritual-entry-href'
import {
  MOON_DAY_NUDGE_DISMISSALS_KEY,
  MOON_DAY_REMINDERS_ENABLED_KEY,
  readMoonDayDismissals,
  readMoonDayRemindersEnabled,
  writeMoonDayDismissal,
} from '@/lib/today/moon-day-nudge-storage'
import { resolveMoonDayNudgeViewState } from '@/lib/today/moon-day-nudge-view-state'

const VIOLET = '#A98AEF'
const INK = '#E3E2ED'
const MUTED = '#A4A3B1'

export interface MoonDayRitualNudgeProps {
  phase: MoonDayNudgePhase
  localDate: string
  ritualDone: boolean
  onStripVisibleChange?: (visible: boolean) => void
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
        marginTop: 2,
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

export function MoonDayRitualNudge({
  phase,
  localDate,
  ritualDone,
  onStripVisibleChange,
}: MoonDayRitualNudgeProps) {
  const copy = MOON_DAY_NUDGE_COPY[phase]
  const dismissalKey = moonDayDismissalKey(phase, localDate)
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setRemindersEnabled(readMoonDayRemindersEnabled())
    setDismissed(isMoonDayDismissed(readMoonDayDismissals(), phase, localDate))
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setHydrated(true)

    const onStorage = (event: StorageEvent) => {
      if (event.key === MOON_DAY_REMINDERS_ENABLED_KEY) {
        setRemindersEnabled(readMoonDayRemindersEnabled())
      }
      if (event.key === MOON_DAY_NUDGE_DISMISSALS_KEY) {
        setDismissed(isMoonDayDismissed(readMoonDayDismissals(), phase, localDate))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [phase, localDate])

  const viewState = resolveMoonDayNudgeViewState({
    phase,
    remindersEnabled,
    dismissed,
    ritualDone,
  })

  const stripVisible =
    hydrated && viewState !== 'hidden' && viewState !== 'dismissed'

  useEffect(() => {
    onStripVisibleChange?.(stripVisible)
  }, [stripVisible, onStripVisibleChange])

  const persistDismiss = useCallback(() => {
    setDismissed(true)
    writeMoonDayDismissal(dismissalKey)
  }, [dismissalKey])

  if (!hydrated || viewState === 'hidden' || viewState === 'dismissed') return null

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
        @media (max-width: 390px) {
          .moon-day-nudge-body-phone { display: none !important; }
        }
      `}</style>
      <div className="flex gap-3">
        <PhaseGlyph phase={phase} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <p
              className="moon-day-nudge-headline min-w-0 flex-1"
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
            <button
              type="button"
              onClick={persistDismiss}
              aria-label={copy.dismiss}
              title={copy.dismiss}
              className="shrink-0"
              style={{
                minHeight: 44,
                minWidth: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '-6px -8px -6px 0',
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
          <p
            className="moon-day-nudge-body-phone mt-1 text-sm leading-snug text-[#A4A3B1] sm:hidden"
            style={{ marginTop: 4 }}
          >
            {copy.bodyPhone}
          </p>
          <p className="mt-1 hidden text-sm leading-snug text-[#A4A3B1] sm:block" style={{ marginTop: 4 }}>
            {copy.body}
          </p>
        </div>
      </div>
      <div className="mt-2 pl-8 sm:pl-8">
        <Link
          href={moonDayRitualEntryHref(phase)}
          className="moon-day-nudge-cta inline-flex w-full items-center justify-center sm:w-auto"
          style={{
            minHeight: 44,
            padding: '0 12px',
            fontSize: 14,
            fontWeight: 600,
            color: VIOLET,
            textDecoration: 'none',
          }}
        >
          {copy.cta}
        </Link>
      </div>
    </div>
  )
}
