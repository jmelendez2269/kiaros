import type { TourSpotRect } from '@/lib/tour/tour-placement'
import {
  IA_TOUR_CARD_GAP_PX,
  IA_TOUR_VIEWPORT_MARGIN_PX,
} from '@/lib/tour/tour-placement'

export type TourCardVerticalMode = 'below' | 'above' | 'sheet'

export type TourCardVerticalPlacement = {
  top: number
  maxHeight: number
  mode: TourCardVerticalMode
}

export function horizontalTourCardLeft(
  viewportWidth: number,
  cardWidth: number,
  margin = IA_TOUR_VIEWPORT_MARGIN_PX,
): number {
  return Math.max(margin, (viewportWidth - cardWidth) / 2)
}

/** Pick card top + max height budget from a real measured card height (mobile). */
export function pickVerticalCardPlacement(
  spot: TourSpotRect,
  viewportHeight: number,
  measuredCardHeight: number,
  options?: {
    margin?: number
    gap?: number
    sheetViewportRatio?: number
  },
): TourCardVerticalPlacement {
  const margin = options?.margin ?? IA_TOUR_VIEWPORT_MARGIN_PX
  const gap = options?.gap ?? IA_TOUR_CARD_GAP_PX
  const sheetRatio = options?.sheetViewportRatio ?? 0.78

  const belowTop = spot.top + spot.height + gap
  const belowSpace = viewportHeight - margin - belowTop

  if (measuredCardHeight <= belowSpace && belowSpace > 0) {
    return { top: belowTop, maxHeight: belowSpace, mode: 'below' }
  }

  const aboveSpace = spot.top - gap - margin
  if (measuredCardHeight <= aboveSpace && aboveSpace > 0) {
    return {
      top: Math.max(margin, spot.top - gap - measuredCardHeight),
      maxHeight: aboveSpace,
      mode: 'above',
    }
  }

  const sheetMax = Math.min(
    viewportHeight * sheetRatio,
    viewportHeight - margin * 2,
  )
  const visibleHeight = Math.min(measuredCardHeight, sheetMax)
  return {
    top: Math.max(margin, viewportHeight - margin - visibleHeight),
    maxHeight: sheetMax,
    mode: 'sheet',
  }
}

export function shouldConstrainTourCardContent(
  measuredCardHeight: number,
  maxHeightBudget: number,
): boolean {
  return measuredCardHeight > maxHeightBudget + 1
}
