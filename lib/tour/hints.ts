/**
 * First-visit hints: a short note on a page, stepping through the two or
 * three things on it worth knowing. They pick up where the sidebar tour
 * stops, at what is on each page. Seen once, then gone; replaying the tour
 * from Settings brings them back.
 *
 * Pure apart from the two storage helpers, so the copy and the stepping are
 * unit-testable.
 */
import { BRAND } from '@/lib/brand'

export type HintPage = 'today' | 'insights' | 'reviews' | 'patterns' | 'mind-map' | 'reflections'

export interface Hint {
  /** Stable: this is what is remembered as seen. */
  id: string
  title: string
  body: string
}

export const PAGE_HINTS: Record<HintPage, Hint[]> = {
  today: [
    {
      id: 'today-check-in',
      title: 'How today is sitting',
      body: 'Under your intention there is a small check-in: one energy level and one mood word. It is optional and never scored. Your look backs read it, so a week without a journal entry still has something of yours in it.',
    },
    {
      id: 'today-written-under',
      title: 'Skies you have written under',
      body: 'When a transit or the moon overhead is one you have journaled under before, Today says so beside it and links to what you wrote.',
    },
    {
      id: 'today-look-backs',
      title: 'Look backs arrive at the top',
      body: 'For a few days after a week, month or quarter closes, its look back appears just under the sky banner. It reads the sky you moved through, whether or not you wrote.',
    },
  ],
  insights: [
    {
      id: 'insights-home',
      title: 'Three ways in',
      body: `Your latest look backs, the sky overhead that you have written under before, and the theme that comes up most in your saved ${BRAND.oracle} conversations. Each card opens onto the fuller page.`,
    },
  ],
  reviews: [
    {
      id: 'reviews-year',
      title: 'Your year on one line',
      body: 'Select a month to see what it held. A filled dot is a look back waiting to be read; a ring is one you have opened.',
    },
    {
      id: 'reviews-weeks',
      title: 'Weeks sit under each month',
      body: 'Each week opens its own reflection once it has ended. A week with nothing recorded is still read, from the sky and your chart.',
    },
    {
      id: 'reviews-views',
      title: 'Two views',
      body: 'Year shows everything at a glance with the sky underneath. List walks month by month, with the sky beside each.',
    },
  ],
  patterns: [
    {
      id: 'patterns-what',
      title: 'What a pattern is',
      body: 'A sky you have written under more than once: a moon phase, a moon sign, a transit to your chart, a retrograde. It is an observation from your own entries, not a rule.',
    },
    {
      id: 'patterns-months',
      title: 'Each one has its months',
      body: 'A pattern lists the months its entries fall in. Select one to open that month in Reviews.',
    },
    {
      id: 'patterns-moon',
      title: 'Under each moon',
      body: 'As you check in on Today, this page begins to show how your energy and mood have sat under each moon phase. It waits for about eight check-ins before saying anything.',
    },
  ],
  'mind-map': [
    {
      id: 'mind-map-stars',
      title: 'Each star is a thread',
      body: `Themes from your saved ${BRAND.oracle} conversations sit near the centre. Brighter stars come up more often, and lines join things that came up together.`,
    },
    {
      id: 'mind-map-select',
      title: 'Select a star',
      body: 'You will see the months it was brightest in and a few of the conversations behind it. A month opens in Reviews.',
    },
  ],
  reflections: [
    {
      id: 'reflections-cards',
      title: 'One card per period',
      body: 'Ready to read means it was written from what you recorded. From the sky means nothing was recorded, so it reads the sky you moved through.',
    },
    {
      id: 'reflections-perspective',
      title: 'You have the last word',
      body: 'Under each observation you can say whether it rings true. A correction is kept and shapes the reflections that follow.',
    },
  ],
}

export const HINTS_STORAGE_KEY = 'kiaros_hints'

/** The first hint on the page not yet seen, with its place in the page's list. null once all are seen. */
export function nextHint(page: HintPage, seen: readonly string[]): { hint: Hint; position: number; total: number } | null {
  const hints = PAGE_HINTS[page]
  const index = hints.findIndex((hint) => !seen.includes(hint.id))
  return index === -1 ? null : { hint: hints[index], position: index + 1, total: hints.length }
}

/** Every hint id on a page, for "skip these". */
export function pageHintIds(page: HintPage): string[] {
  return PAGE_HINTS[page].map((hint) => hint.id)
}

export function parseSeenHints(raw: string | null): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function readSeenHints(): string[] {
  if (typeof window === 'undefined') return []
  try { return parseSeenHints(window.localStorage.getItem(HINTS_STORAGE_KEY)) } catch { return [] }
}

export function markHintsSeen(ids: string[]): string[] {
  const seen = [...new Set([...readSeenHints(), ...ids])]
  try { window.localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(seen)) } catch {}
  return seen
}

/** Bring every hint back, e.g. when the tour is replayed from Settings. */
export function resetHints(): void {
  try { window.localStorage.removeItem(HINTS_STORAGE_KEY) } catch {}
}
