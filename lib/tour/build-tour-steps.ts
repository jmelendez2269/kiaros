import { BRAND } from '@/lib/brand'
import { calendarTabDayHref } from '@/lib/calendar/calendar-day-routes'
import { goalsStudyNavHref } from '@/lib/goals-study/ia-goals-routes'
import { journalTabWriteHref } from '@/lib/journal/ia-journal-routes'
import {
  CALENDAR_TAB_ROW_TOUR_TARGET,
  NAV_CURRICULUM_TOUR_TARGET,
} from '@/lib/almanac/nav-tour-target'
import type { IaTourFlags } from '@/lib/tour/ia-tour-flags'
import { isIaTourActive } from '@/lib/tour/ia-tour-flags'
import type { TourStep } from '@/lib/tour/tour-step'

/** Main-branch tour (all IA flags off). */
export const LEGACY_TOUR_STEPS: TourStep[] = [
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
    title: 'Year',
    body: `Your full year mapped to astronomical timing — the 52-week blueprint ${BRAND.product} built for you, cosmic weather by season, and the arc you're moving through.`,
    cta: 'See Year view',
  },
  {
    id: 'curriculum',
    tourTarget: NAV_CURRICULUM_TOUR_TARGET,
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
]

const TODAY_STEP = LEGACY_TOUR_STEPS[0]

const YEAR_STEP = LEGACY_TOUR_STEPS[1]

const CALENDAR_STEP: TourStep = {
  id: 'calendar',
  tourTarget: CALENDAR_TAB_ROW_TOUR_TARGET,
  requiredRoute: calendarTabDayHref(),
  title: 'Calendar',
  body:
    'Day, week, month and year in one place. Plan your time blocks with the sky alongside, and follow your blueprint week by week.',
  cta: 'Open Calendar',
}

const JOURNAL_LEGACY_STEP = LEGACY_TOUR_STEPS[4]

const JOURNAL_IA_STEP: TourStep = {
  id: 'journal',
  tourTarget: 'nav-journal',
  requiredRoute: journalTabWriteHref(),
  title: 'Journal',
  body:
    "Write on the Write tab and find past entries under Entries. Open Patterns when you're curious about themes in your own words. Each entry keeps the transits from the moment you wrote it.",
  cta: 'Open Journal',
}

const CURRICULUM_STEP = LEGACY_TOUR_STEPS[2]

const SELF_STEP = LEGACY_TOUR_STEPS[3]

const GOALS_STUDY_STEP: TourStep = {
  id: 'goals-study',
  tourTarget: 'nav-goalsStudy',
  requiredRoute: goalsStudyNavHref(),
  title: 'Goals and study',
  body:
    "Life areas hold your goals alongside your chart. Curriculum holds your study plans, and sessions show up on Today when it's time to learn.",
  cta: 'Open Goals and study',
}

export const STELLOQUY_TOUR_STEP: TourStep = {
  id: 'stelloquy',
  tourTarget: 'nav-stelloquy',
  requiredRoute: '/oracle',
  title: BRAND.oracle,
  body:
    'A tab for your ongoing conversation with the stars. The floating star opens the same thread from any page.',
  cta: `Open ${BRAND.oracle}`,
}

/** @deprecated Use STELLOQUY_TOUR_STEP */
export const STELLOQUY_TOUR_PLACEHOLDER = STELLOQUY_TOUR_STEP

export function buildTourSteps(flags: IaTourFlags): TourStep[] {
  if (!isIaTourActive(flags)) {
    return LEGACY_TOUR_STEPS
  }

  const steps: TourStep[] = [TODAY_STEP]
  steps.push(flags.calendarDay ? CALENDAR_STEP : YEAR_STEP)
  steps.push(flags.journal ? JOURNAL_IA_STEP : JOURNAL_LEGACY_STEP)

  if (flags.goals) {
    steps.push(GOALS_STUDY_STEP)
  } else {
    steps.push(CURRICULUM_STEP, SELF_STEP)
  }

  if (flags.overlays) {
    steps.push(STELLOQUY_TOUR_STEP)
  }

  return steps
}
