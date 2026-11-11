import { BRAND } from '@/lib/brand'
import { resetHints } from './hints'

export interface TourStep {
  id: string
  tourTarget: string     // value of the data-tour attribute on the nav element
  /** Tried in order when tourTarget is not on screen, e.g. a sub-item inside a collapsed section. */
  fallbackTargets?: string[]
  requiredRoute: string  // where "Go there →" navigates
  title: string
  body: string
  cta: string
}

/** In sidebar order, so the spotlight moves straight down the navigation. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'today',
    tourTarget: 'nav-today',
    requiredRoute: '/today',
    title: 'Today',
    body: 'The sky above you right now, an intention drawn from your Blueprint, and the transits shaping your day. There is a small check-in for how the day is sitting, and your look backs arrive here when a week or month closes.',
    cta: 'See Today',
  },
  {
    id: 'journal',
    tourTarget: 'nav-journal',
    requiredRoute: '/journal',
    title: 'Journal',
    body: `Every entry is stamped with the sky it was written under. You choose which entries ${BRAND.product} may draw on, and the rest stay out of it.`,
    cta: 'Open Journal',
  },
  {
    id: 'stelloquy',
    tourTarget: 'nav-stelloquy',
    requiredRoute: '/oracle',
    title: BRAND.oracle,
    body: 'An ongoing conversation that knows your chart, your Blueprint and the sky right now. Save any moment worth keeping, and its themes begin to chart on your Mind map.',
    cta: `Open ${BRAND.oracle}`,
  },
  {
    id: 'insights',
    tourTarget: 'nav-insights',
    requiredRoute: '/insights',
    title: 'Insights',
    body: 'Where your entries, conversations and the sky come together. Reviews holds a look back for every week, month and quarter. Patterns shows the skies you keep writing under. The Mind map charts the themes of your conversations.',
    cta: 'See Insights',
  },
  {
    id: 'year',
    tourTarget: 'nav-year',
    requiredRoute: '/year',
    title: 'Calendar',
    body: 'Your week, month and year mapped to astronomical timing: the cosmic weather by season, and the arc you are moving through.',
    cta: 'See your calendar',
  },
  {
    id: 'blueprint',
    tourTarget: 'nav-blueprint',
    requiredRoute: '/blueprint',
    title: 'Blueprint',
    body: `Your year, written week by week from your chart, your goals and the real sky. Everything else in ${BRAND.product} draws on it.`,
    cta: 'Read your Blueprint',
  },
  {
    id: 'self',
    tourTarget: 'nav-self',
    requiredRoute: '/self',
    title: 'Self',
    body: 'Your natal chart, Human Design bodygraph, and life areas. The foundation everything else is built on: your timing layer, your type, your territory.',
    cta: 'Explore Self',
  },
  {
    id: 'curriculum',
    tourTarget: 'nav-curriculum',
    // Curriculum is a sub-item; when its section is closed, point at the section instead.
    fallbackTargets: ['nav-goalsStudy', 'nav-self'],
    requiredRoute: '/curriculum',
    title: 'Curriculum',
    body: 'A week-by-week study plan tied to your Blueprint timeline. Sessions schedule themselves and show up on Today, so nothing falls through.',
    cta: 'See Curriculum',
  },
]

/** The data-tour values to look for, in order, for a step. */
export function tourTargets(step: Pick<TourStep, 'tourTarget' | 'fallbackTargets'>): string[] {
  return [step.tourTarget, ...(step.fallbackTargets ?? [])]
}

export interface TourState {
  active: boolean
  step: number
  completed: boolean
}

export const TOUR_STORAGE_KEY = 'kiaros_tour'
export const TOUR_PENDING_KEY = 'kiaros_tour_pending'
export const TOUR_RESTART_EVENT = 'kiaros-tour-restart'

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
  // A replay starts everything over, the on-page hints included.
  resetHints()
  setTourState({ active: true, step: 0, completed: false })
  window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT))
}
