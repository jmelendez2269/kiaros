export type TourSpotRect = {
  left: number
  top: number
  width: number
  height: number
}

export type TourCardLayout = {
  left: number
  top: number
  maxHeight: number
  cardWidth: number
}

export const IA_TOUR_CARD_WIDTH_PX = 344
export const IA_TOUR_CARD_GAP_PX = 12
export const IA_TOUR_VIEWPORT_MARGIN_PX = 8
export const IA_TOUR_MIN_CARD_BODY_PX = 160

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  gap = 0,
): boolean {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  )
}

function cardRect(layout: TourCardLayout, height: number) {
  return {
    left: layout.left,
    top: layout.top,
    right: layout.left + layout.cardWidth,
    bottom: layout.top + height,
  }
}

function spotBounds(spot: TourSpotRect) {
  return {
    left: spot.left,
    top: spot.top,
    right: spot.left + spot.width,
    bottom: spot.top + spot.height,
  }
}

/** Place the tour card above or below the spotlight when possible; never cover the target. */
export function computeIaTourCardLayout(
  spot: TourSpotRect,
  viewportWidth: number,
  viewportHeight: number,
  mobileNav: boolean,
): TourCardLayout {
  const margin = IA_TOUR_VIEWPORT_MARGIN_PX
  const gap = IA_TOUR_CARD_GAP_PX
  const cardWidth = Math.min(IA_TOUR_CARD_WIDTH_PX, viewportWidth - margin * 2)
  const spotBox = spotBounds(spot)

  const spaceBelow = viewportHeight - margin - (spot.top + spot.height + gap)
  const spaceAbove = spot.top - gap - margin

  const candidates: TourCardLayout[] = []

  if (spaceBelow >= IA_TOUR_MIN_CARD_BODY_PX) {
    const top = spot.top + spot.height + gap
    const maxHeight = viewportHeight - top - margin
    candidates.push({
      left: clamp(spot.left, margin, viewportWidth - cardWidth - margin),
      top,
      maxHeight,
      cardWidth,
    })
  }

  if (spaceAbove >= IA_TOUR_MIN_CARD_BODY_PX) {
    const maxHeight = Math.min(spaceAbove, viewportHeight - margin * 2)
    const top = Math.max(margin, spot.top - gap - maxHeight)
    candidates.push({
      left: clamp(spot.left, margin, viewportWidth - cardWidth - margin),
      top,
      maxHeight: spot.top - gap - top,
      cardWidth,
    })
  }

  if (!mobileNav && viewportWidth >= 768) {
    const left = spot.left + spot.width + gap
    if (left + cardWidth <= viewportWidth - margin) {
      const top = clamp(spot.top, margin, viewportHeight - IA_TOUR_MIN_CARD_BODY_PX - margin)
      candidates.push({
        left,
        top,
        maxHeight: viewportHeight - top - margin,
        cardWidth,
      })
    }
  }

  if (candidates.length === 0) {
    const top = clamp(
      spot.top + spot.height + gap,
      margin,
      viewportHeight - IA_TOUR_MIN_CARD_BODY_PX - margin,
    )
    candidates.push({
      left: clamp(spot.left, margin, viewportWidth - cardWidth - margin),
      top,
      maxHeight: viewportHeight - top - margin,
      cardWidth,
    })
  }

  const estimateHeight = (layout: TourCardLayout) =>
    Math.min(layout.maxHeight, 320)

  for (const layout of candidates) {
    const height = estimateHeight(layout)
    if (!rectsOverlap(cardRect(layout, height), spotBox, gap)) {
      return {
        ...layout,
        maxHeight: Math.max(IA_TOUR_MIN_CARD_BODY_PX, layout.maxHeight),
      }
    }
  }

  const fallback = candidates[0]
  return {
    ...fallback,
    maxHeight: Math.max(IA_TOUR_MIN_CARD_BODY_PX, fallback.maxHeight),
  }
}
