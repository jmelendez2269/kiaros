import { shortDate } from './detect'
import type { NatalPoint, SkyCycle, SkyCycleStatus } from './types'

/**
 * Copy for sky cycles. Pattern, not prophecy: astrology is a lens ("often
 * read as"), never a cause or a forecast. No ampersands or em dashes.
 */

const PLANET_THEMES: Record<string, string> = {
  Mercury: 'conversations, plans, travel and tech',
  Venus: 'relationships, values and money',
  Mars: 'drive, conflict and pace',
  Jupiter: 'growth, belief and opportunity',
  Saturn: 'structure, commitments and limits',
  Uranus: 'change, freedom and surprise',
  Neptune: 'dreams, intuition and boundaries',
  Pluto: 'power, endings and deep change',
  Sun: 'energy and focus',
}

const POINT_THEMES: Record<NatalPoint, string> = {
  Sun: 'your sense of self and vitality',
  Moon: 'your feelings, needs and home life',
  Ascendant: 'how you meet the world',
  Midheaven: 'your work and direction',
}

const SEASON_LINES: Record<string, string> = {
  spring: 'a natural moment to start something and notice what wants to grow',
  summer: 'a natural moment to tend what is already growing',
  autumn: 'a natural moment to gather in, take stock and let some things go',
  winter: 'a natural moment to rest, go inward and keep only what matters',
}

export function cycleMeaning(cycle: SkyCycle): string {
  switch (cycle.kind) {
    case 'retrograde':
      return `Astrologers often read ${cycle.planet} retrograde as a time to review, revisit and redo rather than launch, especially around ${PLANET_THEMES[cycle.planet ?? ''] ?? 'what this planet rules'}.`
    case 'eclipse':
      return 'Eclipse seasons are often read as turning points, when things begin or wrap up faster than usual. Many people keep plans light and notice what shifts.'
    case 'ingress':
      return `${cycle.planet} stays in a sign for a long time, so this is read as a change in the wider backdrop around ${PLANET_THEMES[cycle.planet ?? ''] ?? 'its themes'}.`
    case 'season':
      return `A seasonal gate: ${SEASON_LINES[cycle.seasonName ?? ''] ?? 'a natural moment to pause and look around'}.`
    case 'personal_transit': {
      const planetTheme = PLANET_THEMES[cycle.planet ?? ''] ?? 'its themes'
      const pointTheme = cycle.natalPoint ? POINT_THEMES[cycle.natalPoint] : 'your chart'
      return `A personal one: ${cycle.planet}'s themes of ${planetTheme} meet ${pointTheme}. These tend to unfold slowly, over weeks or months.`
    }
  }
}

export function phaseLabel(status: SkyCycleStatus): string {
  switch (status.phase) {
    case 'upcoming':
      if (status.dayCount === 0) return 'Begins today'
      if (status.dayCount === 1) return 'Begins tomorrow'
      return `Begins in ${status.dayCount} days, ${shortDate(status.cycle.startDate)}`
    case 'active':
      return `Day ${status.dayCount} of ${status.totalDays}`
    case 'ended':
      if (status.dayCount <= 1) return 'Just ended'
      return `Ended ${status.dayCount} days ago`
  }
}

export function phaseKicker(status: SkyCycleStatus): string {
  if (status.phase === 'upcoming') return 'Heads up'
  if (status.phase === 'active') return 'Under way'
  return 'Look back'
}

export function journalPromptFor(status: SkyCycleStatus): string {
  const { cycle } = status
  if (status.phase === 'upcoming') {
    return `${cycle.title} begins ${shortDate(cycle.startDate)}. What would I like to prepare, or put down, before it starts?`
  }
  if (status.phase === 'active') {
    return `${cycle.title}, day ${status.dayCount}. What is coming up for me right now?`
  }
  return `${cycle.title} has ended. What did it bring up, and what am I keeping?`
}

export function stelloquyPromptFor(status: SkyCycleStatus): string {
  const { cycle } = status
  if (status.phase === 'upcoming') {
    return `${cycle.title} begins on ${shortDate(cycle.startDate)} (${cycle.subtitle}). Looking at my chart and what I've written before, how might I prepare? Is there anything from the last time worth remembering?`
  }
  if (status.phase === 'active') {
    return `We're in ${cycle.title} (${cycle.subtitle}), day ${status.dayCount} of ${status.totalDays}. Can we check in on how it's landing for me, using my chart and recent entries?`
  }
  return `${cycle.title} just ended (${cycle.subtitle}). Can we look back on it together: what I wrote during it, what I planned, and what I might carry forward?`
}

export function journalHrefFor(status: SkyCycleStatus): string {
  return `/journal?prompt=${encodeURIComponent(journalPromptFor(status))}`
}
