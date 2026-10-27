/** Scroll containers that may clip sidebar / drawer nav targets. */
export function findVerticalScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight + 1
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

export type ScrollTourTargetMetrics = {
  elTop: number
  elBottom: number
  parentTop: number
  parentBottom: number
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export function scrollTopAfterAlignTarget(
  metrics: ScrollTourTargetMetrics,
  padding = 16,
): number {
  const { elTop, elBottom, parentTop, parentBottom, scrollTop } = metrics
  if (elTop < parentTop + padding) {
    return scrollTop - (parentTop + padding - elTop)
  }
  if (elBottom > parentBottom - padding) {
    return scrollTop + (elBottom - (parentBottom - padding))
  }
  return scrollTop
}

/** Bring a tour target into view inside its scroll parent or the viewport. */
export function scrollTourTargetIntoView(el: HTMLElement, padding = 16): void {
  const scrollParent = findVerticalScrollParent(el)
  if (scrollParent) {
    const elRect = el.getBoundingClientRect()
    const parentRect = scrollParent.getBoundingClientRect()
    const next = scrollTopAfterAlignTarget({
      elTop: elRect.top,
      elBottom: elRect.bottom,
      parentTop: parentRect.top,
      parentBottom: parentRect.bottom,
      scrollTop: scrollParent.scrollTop,
      scrollHeight: scrollParent.scrollHeight,
      clientHeight: scrollParent.clientHeight,
    }, padding)
    scrollParent.scrollTop = next
    return
  }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
}

/** Scroll target up so at least `reserveBelowPx` sits below it in the viewport. */
export function scrollTourTargetClearanceBelow(
  el: HTMLElement,
  reserveBelowPx: number,
  viewportMargin = 16,
): boolean {
  const rect = el.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - viewportMargin - rect.bottom
  const shortage = reserveBelowPx - spaceBelow
  if (shortage <= 0) return false

  const scrollParent = findVerticalScrollParent(el)
  if (scrollParent) {
    scrollParent.scrollTop += shortage
    return true
  }
  window.scrollBy(0, shortage)
  return true
}
