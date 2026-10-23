export const TOUR_SPOTLIGHT_BORDER_PX = 2

/** Minimum clearance between spotlight outer edge and tour card (matches IA_TOUR_CARD_GAP_PX). */
export const TOUR_CARD_SPOT_MIN_GAP_PX = 12

const TOUR_VIEWPORT_MARGIN_PX = 8

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
  const cardBottom = top + cardHeight

  const relation = top >= outerBottom - 2
    ? 'below'
    : cardBottom <= outerTop + 2
      ? 'above'
      : 'overlap'

  if (relation === 'below') {
    const minTop = outerBottom + minGap
    top = Math.max(top, minTop)
  } else if (relation === 'above') {
    const maxBottom = outerTop - minGap
    top = Math.min(top, maxBottom - cardHeight)
  } else {
    const belowTop = outerBottom + minGap
    if (belowTop + cardHeight <= input.viewportHeight - margin) {
      top = belowTop
    } else {
      const aboveTop = outerTop - minGap - cardHeight
      top = Math.max(margin, aboveTop)
    }
  }

  const maxTop = Math.max(margin, input.viewportHeight - margin - cardHeight)
  return Math.min(Math.max(margin, top), maxTop)
}
