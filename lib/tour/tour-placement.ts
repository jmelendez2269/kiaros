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

/** Conservative min card height so placement leaves room for full copy + footer. */
export function estimateIaTourCardMinHeight(input: {
  body: string
  cardWidth: number
  stepCount: number
  showBack: boolean
}): number {
  const horizontalPad = 44
  const innerWidth = Math.max(180, input.cardWidth - horizontalPad)
  const avgCharWidth = 7.1
  const lineHeightPx = 13.5 * 1.65
  const charsPerLine = Math.max(1, Math.floor(innerWidth / avgCharWidth))
  const lineCount = Math.max(1, Math.ceil(input.body.length / charsPerLine))
  const headerBlock = 22 + 10 + Math.ceil(23 * 1.15) + 10
  const dotsRow = 4 + 5 + 14
  const ctaRow = 20 + 12
  const buttonRow = 40
  const skipRow = 32 + 16
  const backButtonExtra = input.showBack ? 0 : 0
  const footer =
    dotsRow + ctaRow + buttonRow + skipRow + backButtonExtra + input.stepCount * 0
  return headerBlock + lineCount * lineHeightPx + footer + 12
}

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
function pickBestCardLayout(
  candidates: TourCardLayout[],
  spot: TourSpotRect,
  gap: number,
  minCardHeight: number,
): TourCardLayout {
  const spotBox = spotBounds(spot)
  const heightForLayout = (layout: TourCardLayout) =>
    Math.min(layout.maxHeight, Math.max(minCardHeight, IA_TOUR_MIN_CARD_BODY_PX))

  const nonOverlapping = candidates.filter((layout) => {
    const height = heightForLayout(layout)
    return !rectsOverlap(cardRect(layout, height), spotBox, gap)
  })
  const pool = nonOverlapping.length > 0 ? nonOverlapping : candidates

  const fitsContent = pool.filter((layout) => layout.maxHeight >= minCardHeight)
  const ranked = (fitsContent.length > 0 ? fitsContent : pool).slice().sort(
    (a, b) => b.maxHeight - a.maxHeight,
  )
  const chosen = ranked[0] ?? candidates[0]
  return {
    ...chosen,
    maxHeight: Math.max(IA_TOUR_MIN_CARD_BODY_PX, chosen.maxHeight),
  }
}

export function computeIaTourCardLayout(
  spot: TourSpotRect,
  viewportWidth: number,
  viewportHeight: number,
  mobileNav: boolean,
  minCardHeight = IA_TOUR_MIN_CARD_BODY_PX,
): TourCardLayout {
  const margin = IA_TOUR_VIEWPORT_MARGIN_PX
  const gap = IA_TOUR_CARD_GAP_PX
  const cardWidth = Math.min(IA_TOUR_CARD_WIDTH_PX, viewportWidth - margin * 2)

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

  return pickBestCardLayout(candidates, spot, gap, minCardHeight)
}
