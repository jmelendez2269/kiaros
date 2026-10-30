export const TOUR_IA_FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function listFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
  )
}

export function handleTourFocusTrap(e: KeyboardEvent, container: HTMLElement): void {
  if (e.key !== 'Tab') return
  const focusable = listFocusableElements(container)
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (e.shiftKey) {
    if (active === first || !container.contains(active)) {
      e.preventDefault()
      last.focus()
    }
    return
  }

  if (active === last) {
    e.preventDefault()
    first.focus()
  }
}
