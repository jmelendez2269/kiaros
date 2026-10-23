import {
  horizontalTourCardLeft,
  pickVerticalCardPlacement,
  shouldConstrainTourCardContent,
} from '@/lib/tour/tour-card-vertical-placement'
import type { TourSpotRect } from '@/lib/tour/tour-placement'
import { IA_TOUR_VIEWPORT_MARGIN_PX } from '@/lib/tour/tour-placement'
import { enforceCardTopMinSpotGap } from '@/lib/tour/tour-spotlight-gap'

export type MeasuredTourCardElements = {
  card: HTMLElement
  scrollRegion: HTMLElement
  footer: HTMLElement
}

export type AppliedTourCardLayout = {
  left: number
  top: number
  cardWidth: number
  constrained: boolean
  maxHeight?: number
  mode: 'below' | 'above' | 'sheet' | 'desktop'
}

export function resetMeasuredTourCardLayout(elements: MeasuredTourCardElements): void {
  const { card, scrollRegion } = elements
  card.style.height = 'auto'
  card.style.maxHeight = ''
  scrollRegion.style.maxHeight = ''
  scrollRegion.style.overflowY = 'visible'
}

export function measureTourCardNaturalHeight(elements: MeasuredTourCardElements): {
  total: number
  footer: number
  scrollContent: number
} {
  const { card, scrollRegion, footer } = elements
  return {
    total: card.offsetHeight,
    footer: footer.offsetHeight,
    scrollContent: scrollRegion.scrollHeight,
  }
}

/** Apply mobile placement from real DOM measurements (height auto until capped). */
export function applyMeasuredMobileTourCardLayout(input: {
  elements: MeasuredTourCardElements
  spot: TourSpotRect
  viewportWidth: number
  viewportHeight: number
  cardWidth: number
}): AppliedTourCardLayout {
  const { elements, spot, viewportWidth, viewportHeight, cardWidth } = input
  resetMeasuredTourCardLayout(elements)

  const natural = measureTourCardNaturalHeight(elements)
  const left = horizontalTourCardLeft(viewportWidth, cardWidth)
  const placement = pickVerticalCardPlacement(spot, viewportHeight, natural.total)
  let top = enforceCardTopMinSpotGap({
    spot,
    cardTop: placement.top,
    cardHeight: natural.total,
    viewportHeight,
  })
  const belowBudget = viewportHeight - IA_TOUR_VIEWPORT_MARGIN_PX - top
  const maxHeight = Math.max(56, belowBudget)
  const constrained = shouldConstrainTourCardContent(natural.total, maxHeight)

  if (constrained) {
    elements.card.style.maxHeight = `${maxHeight}px`
    const scrollMax = Math.max(56, maxHeight - natural.footer)
    elements.scrollRegion.style.maxHeight = `${scrollMax}px`
    elements.scrollRegion.style.overflowY = 'auto'
    top = enforceCardTopMinSpotGap({
      spot,
      cardTop: top,
      cardHeight: elements.card.offsetHeight,
      viewportHeight,
    })
  }

  return {
    left,
    top,
    cardWidth,
    constrained,
    maxHeight: constrained ? maxHeight : undefined,
    mode: placement.mode,
  }
}

/** Desktop: keep seeded position; only cap scroll region when content exceeds budget. */
export function applyMeasuredDesktopTourCardLayout(input: {
  elements: MeasuredTourCardElements
  spot: TourSpotRect
  left: number
  top: number
  maxHeightBudget: number
  cardWidth: number
  viewportHeight: number
}): AppliedTourCardLayout {
  const { elements, spot, left, top: seedTop, maxHeightBudget, cardWidth, viewportHeight } = input
  resetMeasuredTourCardLayout(elements)

  const natural = measureTourCardNaturalHeight(elements)
  let top = enforceCardTopMinSpotGap({
    spot,
    cardTop: seedTop,
    cardHeight: natural.total,
    viewportHeight,
  })
  const belowBudget = Math.min(maxHeightBudget, viewportHeight - IA_TOUR_VIEWPORT_MARGIN_PX - top)
  const constrained = shouldConstrainTourCardContent(natural.total, belowBudget)

  if (constrained) {
    elements.card.style.maxHeight = `${belowBudget}px`
    const scrollMax = Math.max(56, belowBudget - natural.footer)
    elements.scrollRegion.style.maxHeight = `${scrollMax}px`
    elements.scrollRegion.style.overflowY = 'auto'
    top = enforceCardTopMinSpotGap({
      spot,
      cardTop: top,
      cardHeight: elements.card.offsetHeight,
      viewportHeight,
    })
  }

  return {
    left,
    top,
    cardWidth,
    constrained,
    maxHeight: constrained ? belowBudget : undefined,
    mode: 'desktop',
  }
}

export function tourCardBodyTextFullyVisible(
  bodyText: HTMLElement,
  dots: HTMLElement,
): boolean {
  const textRect = bodyText.getBoundingClientRect()
  const dotsRect = dots.getBoundingClientRect()
  if (dotsRect.top < textRect.bottom - 1) return false
  return bodyText.scrollHeight <= bodyText.clientHeight + 1
}

export function mobileViewportMarginBottom(): number {
  return IA_TOUR_VIEWPORT_MARGIN_PX
}
