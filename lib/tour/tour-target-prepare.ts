import {
  findVerticalScrollParent,
  scrollTourTargetIntoView,
} from '@/lib/tour/tour-scroll-into-view'
import {
  TOUR_CARD_SPOT_MIN_GAP_PX,
  TOUR_SPOTLIGHT_BORDER_PX,
} from '@/lib/tour/tour-spotlight-gap'
import { IA_TOUR_VIEWPORT_MARGIN_PX } from '@/lib/tour/tour-placement'

/** Typical mobile tour card height reserve (measure pass refines). */
export const TOUR_MOBILE_CARD_RESERVE_BELOW_PX = 340

export function mobileTourReserveBelowPx(): number {
  return (
    TOUR_MOBILE_CARD_RESERVE_BELOW_PX +
    TOUR_CARD_SPOT_MIN_GAP_PX +
    TOUR_SPOTLIGHT_BORDER_PX * 2
  )
}

export type TargetViewportMetrics = {
  targetTop: number
  targetBottom: number
  viewportHeight: number
}

/** One scroll delta to move target up for card clearance (null = done). */
export function nextPrepareScrollDelta(
  metrics: TargetViewportMetrics,
  reserveBelowPx: number,
  options?: { margin?: number; desiredTargetTop?: number },
): number | null {
  const margin = options?.margin ?? IA_TOUR_VIEWPORT_MARGIN_PX
  const desiredTargetTop = options?.desiredTargetTop ?? margin + 68
  const spaceBelow = metrics.viewportHeight - margin - metrics.targetBottom

  if (spaceBelow < reserveBelowPx) {
    return reserveBelowPx - spaceBelow + 12
  }
  if (metrics.targetTop > desiredTargetTop + 48) {
    return metrics.targetTop - desiredTargetTop
  }
  return null
}

export function readTargetViewportMetrics(el: HTMLElement): TargetViewportMetrics {
  const rect = el.getBoundingClientRect()
  return {
    targetTop: rect.top,
    targetBottom: rect.bottom,
    viewportHeight: window.innerHeight,
  }
}

/**
 * Scroll drawer/page so the target sits in the upper viewport with room below
 * for the tour card — run before spotlight/card measurement.
 */
export function prepareTourTargetForCardPlacement(
  el: HTMLElement,
  reserveBelowPx: number,
): void {
  scrollTourTargetIntoView(el, IA_TOUR_VIEWPORT_MARGIN_PX)

  const scrollParent = findVerticalScrollParent(el)
  const scrollRoot = scrollParent ?? document.scrollingElement ?? document.documentElement

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const delta = nextPrepareScrollDelta(readTargetViewportMetrics(el), reserveBelowPx)
    if (delta === null || delta <= 0) break

    if (scrollParent) {
      scrollParent.scrollTop += delta
    } else if (scrollRoot) {
      scrollRoot.scrollTop += delta
    } else {
      window.scrollBy(0, delta)
    }
  }
}
