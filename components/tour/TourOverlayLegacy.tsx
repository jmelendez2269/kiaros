'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TOUR_PENDING_KEY,
  TOUR_RESTART_EVENT,
  getTourState,
  setTourState,
  type TourState,
} from '@/lib/tour/config'
import type { TourStep } from '@/lib/tour/tour-step'
import { K } from '@/components/almanac/tokens'

const PAD = 8

interface SpotRect {
  left: number
  top: number
  width: number
  height: number
}

/** Main-branch tour UI and measurement (flags off). */
export function TourOverlayLegacy({ steps }: { steps: TourStep[] }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [tourState, setLocal] = useState<TourState>({ active: false, step: 0, completed: false })
  const [spot, setSpot] = useState<SpotRect | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const applyState = useCallback((next: TourState) => {
    setTourState(next)
    setLocal(next)
  }, [])

  const attachSpotlight = useCallback((target: string) => {
    cleanupRef.current?.()

    function measure() {
      const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null
      if (!el) { setSpot(null); return }
      const r = el.getBoundingClientRect()
      setSpot({ left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true, capture: true })

    cleanupRef.current = () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, { capture: true })
    }
  }, [])

  useEffect(() => {
    setMounted(true)

    const pending = localStorage.getItem(TOUR_PENDING_KEY)
    if (pending === '1') {
      localStorage.removeItem(TOUR_PENDING_KEY)
      const fresh: TourState = { active: true, step: 0, completed: false }
      setTourState(fresh)
      setLocal(fresh)
      if (steps[0]) attachSpotlight(steps[0].tourTarget)
      return
    }

    const saved = getTourState()
    setLocal(saved)
    if (saved.active && !saved.completed && steps[saved.step]) {
      attachSpotlight(steps[saved.step].tourTarget)
    }
  }, [attachSpotlight, steps])

  useEffect(() => {
    function onRestart() {
      const s = getTourState()
      setLocal(s)
      if (s.active && !s.completed && steps[s.step]) {
        attachSpotlight(steps[s.step].tourTarget)
      }
    }
    window.addEventListener(TOUR_RESTART_EVENT, onRestart)
    return () => window.removeEventListener(TOUR_RESTART_EVENT, onRestart)
  }, [attachSpotlight, steps])

  useEffect(() => {
    if (!tourState.active || tourState.completed) {
      cleanupRef.current?.()
      cleanupRef.current = null
      setSpot(null)
    }
  }, [tourState.active, tourState.completed])

  function advance() {
    const nextStep = tourState.step + 1
    const done = nextStep >= steps.length
    if (done) {
      applyState({ active: false, step: tourState.step, completed: true })
    } else {
      const next: TourState = { active: true, step: nextStep, completed: false }
      applyState(next)
      attachSpotlight(steps[nextStep].tourTarget)
    }
  }

  function endTour() {
    applyState({ active: false, step: tourState.step, completed: false })
  }

  function goThere() {
    const step = steps[tourState.step]
    if (!step) return
    advance()
    router.push(step.requiredRoute)
  }

  if (!mounted || !tourState.active || tourState.completed) return null

  const currentStep = steps[tourState.step]
  if (!currentStep) return null

  const isLast = tourState.step === steps.length - 1

  const vw = window.innerWidth
  const vh = window.innerHeight

  let tipLeft = spot ? spot.left + spot.width + 18 : vw / 2 - 170
  let tipTop = spot ? spot.top : vh / 2 - 140
  tipLeft = Math.max(8, Math.min(tipLeft, vw - 364))
  tipTop = Math.max(8, Math.min(tipTop, vh - 300))

  return (
    <>
      {spot ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: spot.left,
            top: spot.top,
            width: spot.width,
            height: spot.height,
            borderRadius: 12,
            border: `2px solid ${K.copper}`,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.72), 0 0 24px ${K.copper}55`,
            zIndex: 9000,
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9000, pointerEvents: 'none' }}
        />
      )}

      <div
        role="dialog"
        aria-label={`Tour step ${tourState.step + 1} of ${steps.length}: ${currentStep.title}`}
        style={{
          position: 'fixed',
          left: tipLeft,
          top: tipTop,
          width: 344,
          zIndex: 9001,
          background: K.bg2,
          border: `1px solid ${K.copper}55`,
          borderRadius: 18,
          padding: '22px 22px 16px',
          boxShadow: `0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px ${K.line}`,
        }}
      >
        <div style={{ fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: K.copper, marginBottom: 10 }}>
          {tourState.step + 1} / {steps.length}
        </div>

        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 23, color: K.ink, lineHeight: 1.15, marginBottom: 10 }}>
          {currentStep.title}
        </div>

        <p style={{ fontFamily: K.fBody, fontSize: 13.5, color: K.inkDim, lineHeight: 1.65, marginBottom: 18 }}>
          {currentStep.body}
        </p>

        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5,
                borderRadius: 3,
                width: i === tourState.step ? 22 : 6,
                background: i < tourState.step ? K.copper : i === tourState.step ? K.copperHi : K.line,
                transition: 'width 220ms ease, background 220ms ease',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={goThere}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 10,
              border: `1px solid ${K.copper}88`,
              background: `${K.copper}1e`,
              color: K.ink,
              fontFamily: K.fBody,
              fontSize: 13.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {currentStep.cta} →
          </button>
          <button
            onClick={advance}
            style={{
              padding: '9px 14px',
              borderRadius: 10,
              border: `1px solid ${K.line}`,
              background: 'transparent',
              color: K.inkDim,
              fontFamily: K.fBody,
              fontSize: 13.5,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isLast ? 'Finish' : 'Next →'}
          </button>
        </div>

        <button
          onClick={endTour}
          style={{
            display: 'block',
            marginTop: 12,
            width: '100%',
            textAlign: 'center',
            fontFamily: K.fMono,
            fontSize: 10.5,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: K.inkSoft,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          End tour
        </button>
      </div>
    </>
  )
}
