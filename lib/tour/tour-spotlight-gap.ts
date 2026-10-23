export const TOUR_SPOTLIGHT_BORDER_PX = 2

/** Minimum clearance between spotlight outer edge and tour card (matches IA_TOUR_CARD_GAP_PX). */
export const TOUR_CARD_SPOT_MIN_GAP_PX = 12

const TOUR_VIEWPORT_MARGIN_PX = 8
const SHEET_VIEWPORT_RATIO = 0.78

export type TourSpotlightRect = {
  left: number
  top: number
  width: number
  height: number
}

/** Matches TourOverlayIa spotlight ring (`border: 2px solid`). */
export function spotlightOuterRect(spot: TourSpotlightRect): TourSpotlightRect {
  const b = TOUR_SPOTLIGHT_BORDER_PX
  return {
    left: spot.left - b,
    top: spot.top - b,
    width: spot.width + b * 2,
    height: spot.height + b * 2,
  }
}

export function spotOuterBottom(spot: TourSpotlightRect): number {
  const outer = spotlightOuterRect(spot)
  return outer.top + outer.height
}

export function spotOuterTop(spot: TourSpotlightRect): number {
  return spotlightOuterRect(spot).top
}

/** Vertical gap between spotlight outer box and card (positive = separated). */
export function verticalGapBetweenSpotAndCard(
  spot: TourSpotlightRect,
  cardTop: number,
  cardHeight: number,
): number {
  const outer = spotlightOuterRect(spot)
  const cardBottom = cardTop + cardHeight
  const outerBottom = outer.top + outer.height
  const outerTop = outer.top

  if (cardTop >= outerBottom - 1) {
    return cardTop - outerBottom
  }
  if (cardBottom <= outerTop + 1) {
    return outerTop - cardBottom
  }
  return -Math.min(cardBottom - outerTop, outerBottom - cardTop)
}

export function bottomSheetCardTop(
  viewportHeight: number,
  cardHeight: number,
  margin = TOUR_VIEWPORT_MARGIN_PX,
): number {
  const sheetMax = Math.min(
    viewportHeight * SHEET_VIEWPORT_RATIO,
    viewportHeight - margin * 2,
  )
  const visibleHeight = Math.min(cardHeight, sheetMax)
  return Math.max(margin, viewportHeight - margin - visibleHeight)
}

export function enforceCardTopMinSpotGap(input: {
  spot: TourSpotlightRect
  cardTop: number
  cardHeight: number
  viewportHeight: number
  margin?: number
  minGap?: number
}): number {
  const margin = input.margin ?? TOUR_VIEWPORT_MARGIN_PX
  const minGap = input.minGap ?? TOUR_CARD_SPOT_MIN_GAP_PX
  const outer = spotlightOuterRect(input.spot)
  const outerTop = outer.top
  const outerBottom = outer.top + outer.height
  let top = input.cardTop
  const cardHeight = input.cardHeight

  const belowTop = outerBottom + minGap
  const aboveTop = outerTop - minGap - cardHeight

  if (belowTop + cardHeight <= input.viewportHeight - margin) {
    top = belowTop
  } else if (aboveTop >= margin) {
    top = aboveTop
  } else {
    top = bottomSheetCardTop(input.viewportHeight, cardHeight, margin)
  }

  if (verticalGapBetweenSpotAndCard(input.spot, top, cardHeight) < minGap - 0.5) {
    if (belowTop + cardHeight <= input.viewportHeight - margin) {
      top = belowTop
    } else {
      top = bottomSheetCardTop(input.viewportHeight, cardHeight, margin)
    }
  }

  const maxTop = Math.max(margin, input.viewportHeight - margin - cardHeight)
  top = Math.min(Math.max(margin, top), maxTop)

  if (verticalGapBetweenSpotAndCard(input.spot, top, cardHeight) < minGap - 0.5) {
    top = bottomSheetCardTop(input.viewportHeight, cardHeight, margin)
  }

  return top
}
