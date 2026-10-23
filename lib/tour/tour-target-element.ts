/** Tailwind `md` breakpoint — mobile nav drawer below this width. */
export const TOUR_MOBILE_NAV_MAX_WIDTH_PX = 767

export const ALMANAC_DESKTOP_SIDEBAR_ID = 'almanac-desktop-sidebar'
export const ALMANAC_MOBILE_NAV_ID = 'almanac-mobile-nav'

export function isMobileNavViewport(viewportWidth: number): boolean {
  return viewportWidth <= TOUR_MOBILE_NAV_MAX_WIDTH_PX
}

export type TourTargetVisibilityInput = {
  width: number
  height: number
  display: string
  visibility: string
}

export function isTourTargetVisibleFromMetrics(input: TourTargetVisibilityInput): boolean {
  if (input.width <= 0 || input.height <= 0) return false
  if (input.visibility === 'hidden') return false
  if (input.display === 'none') return false
  return true
}

/** True when the element and every ancestor are displayed (sidebar hidden md:flex duplicates). */
export function isInVisibleAncestry(el: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    node = node.parentElement
  }
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)
  return isTourTargetVisibleFromMetrics({
    width: rect.width,
    height: rect.height,
    display: style.display,
    visibility: style.visibility,
  })
}

export function isTourTargetVisible(el: HTMLElement): boolean {
  return isInVisibleAncestry(el)
}

export function tourTargetElementArea(el: HTMLElement): number {
  const rect = el.getBoundingClientRect()
  return rect.width * rect.height
}

export function pickBestTourTargetElement(
  candidates: HTMLElement[],
  viewportWidth: number,
): HTMLElement | null {
  const visible = candidates.filter(isInVisibleAncestry)
  if (visible.length === 0) return null
  if (visible.length === 1) return visible[0]

  const mobile = isMobileNavViewport(viewportWidth)
  let best = visible[0]
  let bestScore = -Infinity
  for (const el of visible) {
    let score = tourTargetElementArea(el)
    const inMobile = Boolean(el.closest(`#${ALMANAC_MOBILE_NAV_ID}`))
    const inDesktop = Boolean(el.closest(`#${ALMANAC_DESKTOP_SIDEBAR_ID}`))
    if (mobile && inMobile) score += 1_000_000
    if (!mobile && inDesktop && !inMobile) score += 1_000_000
    if (!mobile && inMobile) score -= 1_000_000
    if (score > bestScore) {
      bestScore = score
      best = el
    }
  }
  return best
}

export function findAllTourTargetElements(
  target: string,
  root: ParentNode = document,
): HTMLElement[] {
  return Array.from(root.querySelectorAll(`[data-tour="${target}"]`)) as HTMLElement[]
}

/** Prefer a visible nav link when desktop and mobile drawers both exist in the DOM. */
export function findTourTargetElement(
  target: string,
  root: ParentNode = document,
): HTMLElement | null {
  return findBestTourTargetElement(target, window.innerWidth, root)
}

export function findBestTourTargetElement(
  target: string,
  viewportWidth: number,
  root: ParentNode = document,
): HTMLElement | null {
  return pickBestTourTargetElement(findAllTourTargetElements(target, root), viewportWidth)
}

export type TourSpotRect = {
  left: number
  top: number
  width: number
  height: number
}

export function unionSpotRectFromElements(
  elements: HTMLElement[],
  pad: number,
): TourSpotRect | null {
  if (elements.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const el of elements) {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    left = Math.min(left, r.left)
    top = Math.min(top, r.top)
    right = Math.max(right, r.right)
    bottom = Math.max(bottom, r.bottom)
  }
  if (!Number.isFinite(left)) return null
  return {
    left: left - pad,
    top: top - pad,
    width: right - left + pad * 2,
    height: bottom - top + pad * 2,
  }
}
