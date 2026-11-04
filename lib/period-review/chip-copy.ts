/**
 * TODO-STELLA: final source-chip labels for period review summaries.
 * Lowercase after the number; hide chips at zero in buildSourceChips.
 */

function countLabel(count: number, singular: string, plural: string): string | null {
  if (count <= 0) return null
  if (count === 1) return singular
  return plural.replace('{n}', String(count))
}

export function chipRetrogrades(count: number): string | null {
  return countLabel(count, '1 retrograde', '{n} retrogrades')
}

export function chipJournalEntries(count: number): string | null {
  return countLabel(count, '1 journal entry', '{n} journal entries')
}

export function chipStelloquyCaptures(count: number): string | null {
  return countLabel(count, '1 saved from Stelloquy', '{n} saved from Stelloquy')
}

export function chipPlans(count: number): string | null {
  return countLabel(count, '1 plan done', '{n} plans done')
}

export function chipGoals(count: number): string | null {
  return countLabel(count, '1 goal', '{n} goals')
}

export function chipCheckIns(count: number): string | null {
  return countLabel(count, '1 check-in', '{n} check-ins')
}

export function chipMoonPhases(count: number): string | null {
  return countLabel(count, '1 moon phase', '{n} moon phases')
}

export function chipEclipses(count: number): string | null {
  return countLabel(count, '1 eclipse', '{n} eclipses')
}

export function chipSignChanges(count: number): string | null {
  return countLabel(count, '1 sign change', '{n} sign changes')
}
