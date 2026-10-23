import { LEGACY_TOUR_STEPS } from '@/lib/tour/build-tour-steps'

export type { TourStep } from '@/lib/tour/tour-step'
export { buildTourSteps, LEGACY_TOUR_STEPS, STELLOQUY_TOUR_PLACEHOLDER } from '@/lib/tour/build-tour-steps'
export type { IaTourFlags } from '@/lib/tour/ia-tour-flags'
export { iaTourFlagsFromProcessEnv, isIaTourActive } from '@/lib/tour/ia-tour-flags'

/** @deprecated Use buildTourSteps(flags) or LEGACY_TOUR_STEPS. */
export const TOUR_STEPS = LEGACY_TOUR_STEPS

export interface TourState {
  active: boolean
  step: number
  completed: boolean
}

export const TOUR_STORAGE_KEY = 'kiaros_tour'
export const TOUR_PENDING_KEY = 'kiaros_tour_pending'
export const TOUR_RESTART_EVENT = 'kiaros-tour-restart'
/** Tour asks AlmanacSidebar to open the mobile nav drawer before measuring a target. */
export const TOUR_OPEN_MOBILE_NAV_EVENT = 'kiaros-tour-open-mobile-nav'

export function getTourState(): TourState {
  if (typeof window === 'undefined') return { active: false, step: 0, completed: false }
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!raw) return { active: false, step: 0, completed: false }
    return JSON.parse(raw) as TourState
  } catch {
    return { active: false, step: 0, completed: false }
  }
}

export function setTourState(state: TourState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state))
}

export function startTour(): void {
  setTourState({ active: true, step: 0, completed: false })
  window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT))
}
