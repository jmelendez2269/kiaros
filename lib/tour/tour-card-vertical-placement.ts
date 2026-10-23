import type { TourSpotRect } from '@/lib/tour/tour-placement'
import {
  IA_TOUR_CARD_GAP_PX,
  IA_TOUR_VIEWPORT_MARGIN_PX,
} from '@/lib/tour/tour-placement'
import {
  bottomSheetCardTop,
  spotOuterBottom,
  spotOuterTop,
} from '@/lib/tour/tour-spotlight-gap'

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
  const minGap = options?.gap ?? IA_TOUR_CARD_GAP_PX

  const belowTop = spotOuterBottom(spot) + minGap
  const belowFits = belowTop + measuredCardHeight <= viewportHeight - margin

  if (belowFits) {
    return {
      top: belowTop,
      maxHeight: viewportHeight - margin - belowTop,
      mode: 'below',
    }
  }

  const aboveTop = spotOuterTop(spot) - minGap - measuredCardHeight
  const aboveFits = aboveTop >= margin

  if (aboveFits) {
    return {
      top: aboveTop,
      maxHeight: spotOuterTop(spot) - minGap - aboveTop,
      mode: 'above',
    }
  }

  const sheetTop = bottomSheetCardTop(viewportHeight, measuredCardHeight, margin)
  const sheetMax = Math.min(
    viewportHeight * (options?.sheetViewportRatio ?? 0.78),
    viewportHeight - margin * 2,
  )
  return {
    top: sheetTop,
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
