import { BRAND } from '@/lib/brand'

export interface TourStep {
  id: string
  tourTarget: string     // value of the data-tour attribute on the nav element
  requiredRoute: string  // where "Go there →" navigates
  title: string
  body: string
  cta: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'today',
    tourTarget: 'nav-today',
    requiredRoute: '/today',
    title: 'Today',
    body: "The sky above you right now, this week's intention, and the transits actively shaping your day. A good place to start each morning.",
    cta: 'See Today',
  },
  {
    id: 'year',
    tourTarget: 'nav-year',
    requiredRoute: '/year',
    title: 'Calendar',
    body: `Your week, month and year mapped to astronomical timing — cosmic weather by season and the arc you're moving through. Your 52-week Blueprint sits just below.`,
    cta: 'See your calendar',
  },
  {
    id: 'curriculum',
    tourTarget: 'nav-curriculum',
    requiredRoute: '/curriculum',
    title: 'Curriculum',
    body: "A week-by-week study plan tied to your blueprint timeline. Sessions schedule themselves and show up on Today so nothing falls through.",
    cta: 'See Curriculum',
  },
  {
    id: 'self',
    tourTarget: 'nav-self',
    requiredRoute: '/self',
    title: 'Self',
    body: "Your natal chart, Human Design bodygraph, and life areas. The foundation everything else is built on — your timing layer, your type, your territory.",
    cta: 'Explore Self',
  },
  {
    id: 'journal',
    tourTarget: 'nav-journal',
    requiredRoute: '/journal',
    title: 'Journal',
    body: "Every entry is stamped with the transits active when you wrote it. Over time, patterns surface through Insights — you'll start to see what's actually been moving.",
    cta: 'Open Journal',
  },
  {
    id: 'insights',
    tourTarget: 'nav-insights',
    requiredRoute: '/reviews',
    title: 'Insights',
    body: 'Where your entries, conversations and the sky come together: a review at the end of every month and quarter, and the patterns that keep coming up.',
    cta: 'See Insights',
  },
]

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
  setTourState({ active: true, step: 0, completed: false })
  window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT))
}
