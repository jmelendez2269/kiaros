/** Tailwind `md` breakpoint — mobile nav drawer below this width. */
export const TOUR_MOBILE_NAV_MAX_WIDTH_PX = 767

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

export function isTourTargetVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)
  return isTourTargetVisibleFromMetrics({
    width: rect.width,
    height: rect.height,
    display: style.display,
    visibility: style.visibility,
  })
}

/** Prefer a visible nav link when desktop and mobile drawers both exist in the DOM. */
export function findTourTargetElement(
  target: string,
  root: ParentNode = document,
): HTMLElement | null {
  return findAllTourTargetElements(target, root)[0] ?? null
}

export function findAllTourTargetElements(
  target: string,
  root: ParentNode = document,
): HTMLElement[] {
  const nodes = root.querySelectorAll(`[data-tour="${target}"]`)
  const visible: HTMLElement[] = []
  for (const node of nodes) {
    const el = node as HTMLElement
    if (isTourTargetVisible(el)) visible.push(el)
  }
  return visible
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
