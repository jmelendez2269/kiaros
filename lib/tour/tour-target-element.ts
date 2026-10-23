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
  const nodes = root.querySelectorAll(`[data-tour="${target}"]`)
  for (const node of nodes) {
    const el = node as HTMLElement
    if (isTourTargetVisible(el)) return el
  }
  return null
}
