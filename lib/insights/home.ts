/**
 * Pure helpers for the Insights home page. No server imports, so it is
 * unit-testable.
 */
import type { EphemerisDay } from '@/types/blueprint'
import { dayMatchesPattern, patternGlyph, patternTitle } from './pattern-sky'

export interface HomePattern {
  label: string
  glyph: string
  /** Entries the member has written under this sky. */
  entries: number
}

export interface PatternRowForHome {
  pattern_type: string
  pattern_key: string
  sample_size: number
}

const toHome = (row: PatternRowForHome): HomePattern => ({
  label: patternTitle(row.pattern_type, row.pattern_key),
  glyph: patternGlyph(row.pattern_type, row.pattern_key),
  entries: row.sample_size,
})

const byEntries = (a: PatternRowForHome, b: PatternRowForHome) => b.sample_size - a.sample_size || a.pattern_key.localeCompare(b.pattern_key)

/** A sky needs at least two entries under it before it is called something the member has written under. */
const MIN_ENTRIES = 2

/** The member's patterns whose sky is overhead on the given day, most written-under first. */
export function overheadPatterns(rows: PatternRowForHome[], day: EphemerisDay | null | undefined, limit = 3): HomePattern[] {
  if (!day) return []
  return rows
    .filter((row) => row.sample_size >= MIN_ENTRIES && dayMatchesPattern(day, row.pattern_type, row.pattern_key))
    .sort(byEntries)
    .slice(0, limit)
    .map(toHome)
}

/** The pattern with the most entries behind it, for a day when none is overhead. */
export function strongestPattern(rows: PatternRowForHome[]): HomePattern | null {
  const top = [...rows].filter((row) => row.sample_size >= MIN_ENTRIES).sort(byEntries)[0]
  return top ? toHome(top) : null
}

export interface HomeStar {
  label: string
  /** Saved conversations it comes up in. */
  count: number
  /** Saved conversations with any tag. */
  of: number
}

/** The theme that comes up in the most saved conversations. */
export function brightestTheme(topics: Array<{ capture_id: string; kind: string; label: string }>): HomeStar | null {
  const all = new Set<string>(), byLabel = new Map<string, Set<string>>()
  for (const topic of topics) {
    all.add(topic.capture_id)
    if (topic.kind !== 'theme') continue
    const ids = byLabel.get(topic.label) ?? new Set<string>()
    ids.add(topic.capture_id)
    byLabel.set(topic.label, ids)
  }
  const top = [...byLabel.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))[0]
  return top ? { label: top[0], count: top[1].size, of: all.size } : null
}

export const timesWritten = (n: number) => (n === 1 ? 'written under once' : `written under ${n} times`)
