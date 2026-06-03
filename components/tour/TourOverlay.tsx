'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TOUR_STEPS,
  TOUR_PENDING_KEY,
  TOUR_RESTART_EVENT,
  getTourState,
  setTourState,
  type TourState,
} from '@/lib/tour/config'
import { K } from '@/components/almanac/tokens'

const PAD = 8

interface SpotRect {
  left: number
  top: number
  width: number
  height: number
}

export function TourOverlay() {
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

  // Bootstrap on mount
  useEffect(() => {
    setMounted(true)

    const pending = localStorage.getItem(TOUR_PENDING_KEY)
    if (pending === '1') {
      localStorage.removeItem(TOUR_PENDING_KEY)
      const fresh: TourState = { active: true, step: 0, completed: false }
      setTourState(fresh)
      setLocal(fresh)
      attachSpotlight(TOUR_STEPS[0].tourTarget)
      return
    }

    const saved = getTourState()
    setLocal(saved)
    if (saved.active && !saved.completed && TOUR_STEPS[saved.step]) {
      attachSpotlight(TOUR_STEPS[saved.step].tourTarget)
    }
  }, [attachSpotlight])

  // Restart event from Settings
  useEffect(() => {
    function onRestart() {
      const s = getTourState()
      setLocal(s)
      if (s.active && !s.completed && TOUR_STEPS[s.step]) {
        attachSpotlight(TOUR_STEPS[s.step].tourTarget)
      }
    }
    window.addEventListener(TOUR_RESTART_EVENT, onRestart)
    return () => window.removeEventListener(TOUR_RESTART_EVENT, onRestart)
  }, [attachSpotlight])

  // Cleanup spotlight listeners when tour ends
  useEffect(() => {
    if (!tourState.active || tourState.completed) {
      cleanupRef.current?.()
      cleanupRef.current = null
      setSpot(null)
    }
  }, [tourState.active, tourState.completed])

  function advance() {
    const nextStep = tourState.step + 1
    const done = nextStep >= TOUR_STEPS.length
    if (done) {
      applyState({ active: false, step: tourState.step, completed: true })
    } else {
      const next: TourState = { active: true, step: nextStep, completed: false }
      applyState(next)
      attachSpotlight(TOUR_STEPS[nextStep].tourTarget)
    }
  }

  function endTour() {
    applyState({ active: false, step: tourState.step, completed: false })
  }

  function goThere() {
    const step = TOUR_STEPS[tourState.step]
    if (!step) return
    advance()
    router.push(step.requiredRoute)
  }

  if (!mounted || !tourState.active || tourState.completed) return null

  const currentStep = TOUR_STEPS[tourState.step]
  if (!currentStep) return null

  const isLast = tourState.step === TOUR_STEPS.length - 1

  // Compute tooltip position from spotlight rect
  const vw = window.innerWidth
  const vh = window.innerHeight

  let tipLeft = spot ? spot.left + spot.width + 18 : vw / 2 - 170
  let tipTop = spot ? spot.top : vh / 2 - 140
  tipLeft = Math.max(8, Math.min(tipLeft, vw - 364))
  tipTop = Math.max(8, Math.min(tipTop, vh - 300))

  return (
    <>
      {/* Spotlight: box-shadow creates the dark overlay; element stays visible */}
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
            // The outset shadow darkens everything outside this rect
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

      {/* Tooltip panel */}
      <div
        role="dialog"
        aria-label={`Tour step ${tourState.step + 1} of ${TOUR_STEPS.length}: ${currentStep.title}`}
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
        {/* Step counter */}
        <div style={{ fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: K.copper, marginBottom: 10 }}>
          {tourState.step + 1} / {TOUR_STEPS.length}
        </div>

        {/* Title */}
        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 23, color: K.ink, lineHeight: 1.15, marginBottom: 10 }}>
          {currentStep.title}
        </div>

        {/* Body */}
        <p style={{ fontFamily: K.fBody, fontSize: 13.5, color: K.inkDim, lineHeight: 1.65, marginBottom: 18 }}>
          {currentStep.body}
        </p>

        {/* Progress bar dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {TOUR_STEPS.map((_, i) => (
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

        {/* Actions */}
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

        {/* End tour */}
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
