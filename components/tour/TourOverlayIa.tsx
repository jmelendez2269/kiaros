'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TOUR_OPEN_MOBILE_NAV_EVENT,
  TOUR_PENDING_KEY,
  TOUR_RESTART_EVENT,
  getTourState,
  setTourState,
  type TourState,
} from '@/lib/tour/config'
import type { TourStep } from '@/lib/tour/tour-step'
import { computeIaTourCardLayout } from '@/lib/tour/tour-placement'
import { handleTourFocusTrap, listFocusableElements, TOUR_IA_FOCUS_RING } from '@/lib/tour/tour-focus'
import {
  findVerticalScrollParent,
  scrollTourTargetIntoView,
} from '@/lib/tour/tour-scroll-into-view'
import {
  findTourTargetElement,
  isMobileNavViewport,
  isTourTargetVisible,
} from '@/lib/tour/tour-target-element'
import { cn } from '@/lib/utils'
import { K } from '@/components/almanac/tokens'

const PAD = 8

interface SpotRect {
  left: number
  top: number
  width: number
  height: number
}

export function TourOverlayIa({ steps }: { steps: TourStep[] }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [tourState, setLocal] = useState<TourState>({ active: false, step: 0, completed: false })
  const [spot, setSpot] = useState<SpotRect | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const targetElRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryActionRef = useRef<HTMLButtonElement>(null)
  const tourStepRef = useRef(0)

  const applyState = useCallback((next: TourState) => {
    setTourState(next)
    setLocal(next)
    tourStepRef.current = next.step
  }, [])

  const endTour = useCallback(() => {
    applyState({ active: false, step: tourStepRef.current, completed: false })
  }, [applyState])

  const updateSpotFromRef = useCallback(() => {
    const el = targetElRef.current
    if (!el || !document.contains(el) || !isTourTargetVisible(el)) {
      return
    }
    const r = el.getBoundingClientRect()
    setSpot({
      left: r.left - PAD,
      top: r.top - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    })
  }, [])

  const attachSpotlight = useCallback(
    (target: string) => {
      cleanupRef.current?.()
      cleanupRef.current = null
      targetElRef.current = null
      let mobileNavOpenRequested = false
      let scrollCleanup: (() => void) | null = null

      function resolveAndMeasure() {
        let el = targetElRef.current
        if (el && (!document.contains(el) || !isTourTargetVisible(el))) {
          el = null
          targetElRef.current = null
        }
        if (!el) {
          el = findTourTargetElement(target)
        }

        if (
          !el &&
          isMobileNavViewport(window.innerWidth) &&
          !mobileNavOpenRequested
        ) {
          mobileNavOpenRequested = true
          window.dispatchEvent(new CustomEvent(TOUR_OPEN_MOBILE_NAV_EVENT))
          window.setTimeout(resolveAndMeasure, 100)
          return
        }

        if (!el) {
          setSpot(null)
          return
        }

        targetElRef.current = el
        scrollTourTargetIntoView(el)
        window.requestAnimationFrame(() => {
          updateSpotFromRef()
          scrollCleanup?.()
          const scrollParent = findVerticalScrollParent(el)
          const onReflow = () => updateSpotFromRef()
          window.addEventListener('resize', onReflow)
          scrollParent?.addEventListener('scroll', onReflow, { passive: true })
          scrollCleanup = () => {
            window.removeEventListener('resize', onReflow)
            scrollParent?.removeEventListener('scroll', onReflow)
          }
        })
      }

      function onMobileNavOpen() {
        resolveAndMeasure()
      }

      resolveAndMeasure()
      window.addEventListener(TOUR_OPEN_MOBILE_NAV_EVENT, onMobileNavOpen)

      cleanupRef.current = () => {
        window.removeEventListener(TOUR_OPEN_MOBILE_NAV_EVENT, onMobileNavOpen)
        scrollCleanup?.()
      }
    },
    [updateSpotFromRef],
  )

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
      targetElRef.current = null
      setSpot(null)
    }
  }, [tourState.active, tourState.completed])

  useEffect(() => {
    if (!tourState.active || tourState.completed) return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusables = listFocusableElements(dialog)
    const first = focusables[0] ?? primaryActionRef.current
    first?.focus({ preventScroll: true })
  }, [tourState.step, tourState.active, tourState.completed])

  useEffect(() => {
    if (!tourState.active || tourState.completed) return
    function onKeyDown(e: KeyboardEvent) {
      const dialog = dialogRef.current
      if (!dialog) return
      if (e.key === 'Escape') {
        e.preventDefault()
        endTour()
        return
      }
      handleTourFocusTrap(e, dialog)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tourState.active, tourState.completed, endTour])

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

  function goBack() {
    if (tourState.step <= 0) return
    const prev = tourState.step - 1
    applyState({ active: true, step: prev, completed: false })
    attachSpotlight(steps[prev].tourTarget)
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
  const showBack = tourState.step > 0

  const vw = window.innerWidth
  const vh = window.innerHeight
  const mobileNav = isMobileNavViewport(vw)

  const cardLayout = spot
    ? computeIaTourCardLayout(spot, vw, vh, mobileNav)
    : {
        left: vw / 2 - 170,
        top: vh / 2 - 140,
        maxHeight: vh - 16,
        cardWidth: Math.min(344, vw - 16),
      }

  const buttonClass = cn(
    TOUR_IA_FOCUS_RING,
    'rounded-[10px] font-medium cursor-pointer transition-colors',
  )

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${tourState.step + 1} of ${steps.length}: ${currentStep.title}`}
        style={{
          position: 'fixed',
          left: cardLayout.left,
          top: cardLayout.top,
          width: cardLayout.cardWidth,
          maxHeight: cardLayout.maxHeight,
          zIndex: 9001,
          background: K.bg2,
          border: `1px solid ${K.copper}55`,
          borderRadius: 18,
          boxShadow: `0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px ${K.line}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '22px 22px 12px',
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

          <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
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
        </div>

        <div style={{ flexShrink: 0, padding: '0 22px 16px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {showBack ? (
              <button
                type="button"
                onClick={goBack}
                className={cn(buttonClass, 'border border-solid px-3 py-2 text-[13.5px]')}
                style={{ borderColor: K.line, background: 'transparent', color: K.inkDim, fontFamily: K.fBody }}
              >
                Back
              </button>
            ) : null}
            <button
              ref={primaryActionRef}
              type="button"
              onClick={goThere}
              className={cn(buttonClass, 'flex-1 border border-solid px-3 py-2 text-[13.5px]')}
              style={{
                borderColor: `${K.copper}88`,
                background: `${K.copper}1e`,
                color: K.ink,
                fontFamily: K.fBody,
                minWidth: showBack ? '8rem' : undefined,
              }}
            >
              {currentStep.cta} →
            </button>
            <button
              type="button"
              onClick={advance}
              className={cn(buttonClass, 'border border-solid px-3.5 py-2 text-[13.5px] whitespace-nowrap')}
              style={{ borderColor: K.line, background: 'transparent', color: K.inkDim, fontFamily: K.fBody }}
            >
              {isLast ? 'Finish' : 'Next →'}
            </button>
          </div>

          <button
            type="button"
            onClick={endTour}
            className={cn(buttonClass, 'mt-3 w-full border-0 bg-transparent py-1')}
            style={{
              textAlign: 'center',
              fontFamily: K.fMono,
              fontSize: 10.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: K.inkSoft,
            }}
          >
            End tour
          </button>
        </div>
      </div>
    </>
  )
}
