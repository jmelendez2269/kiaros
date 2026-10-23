import {
  horizontalTourCardLeft,
  pickVerticalCardPlacement,
  shouldConstrainTourCardContent,
} from '@/lib/tour/tour-card-vertical-placement'
import type { TourSpotRect } from '@/lib/tour/tour-placement'
import { IA_TOUR_VIEWPORT_MARGIN_PX } from '@/lib/tour/tour-placement'

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
  const constrained = shouldConstrainTourCardContent(natural.total, placement.maxHeight)

  if (constrained) {
    elements.card.style.maxHeight = `${placement.maxHeight}px`
    const scrollMax = Math.max(56, placement.maxHeight - natural.footer)
    elements.scrollRegion.style.maxHeight = `${scrollMax}px`
    elements.scrollRegion.style.overflowY = 'auto'
  }

  return {
    left,
    top: placement.top,
    cardWidth,
    constrained,
    maxHeight: constrained ? placement.maxHeight : undefined,
    mode: placement.mode,
  }
}

/** Desktop: keep seeded position; only cap scroll region when content exceeds budget. */
export function applyMeasuredDesktopTourCardLayout(input: {
  elements: MeasuredTourCardElements
  left: number
  top: number
  maxHeightBudget: number
  cardWidth: number
}): AppliedTourCardLayout {
  const { elements, left, top, maxHeightBudget, cardWidth } = input
  resetMeasuredTourCardLayout(elements)

  const natural = measureTourCardNaturalHeight(elements)
  const constrained = shouldConstrainTourCardContent(natural.total, maxHeightBudget)

  if (constrained) {
    elements.card.style.maxHeight = `${maxHeightBudget}px`
    const scrollMax = Math.max(56, maxHeightBudget - natural.footer)
    elements.scrollRegion.style.maxHeight = `${scrollMax}px`
    elements.scrollRegion.style.overflowY = 'auto'
  }

  return {
    left,
    top,
    cardWidth,
    constrained,
    maxHeight: constrained ? maxHeightBudget : undefined,
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
