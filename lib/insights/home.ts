/**
 * Pure helpers for the Insights home page. No server imports, so it is
 * unit-testable.
 */
import type { EphemerisDay } from '@/types/blueprint'
import { ESTABLISHED_PATTERN_MIN_SAMPLE } from '@/lib/journal/pattern-discoveries'
import { dayMatchesPattern, patternGlyph, patternTitle } from './pattern-sky'

export interface HomePattern {
  /** The pattern's row id, when known: its anchor on the Patterns page. */
  id?: string
  label: string
  glyph: string
  /** Entries the member has written under this sky. */
  entries: number
}

export interface PatternRowForHome {
  id?: string
  pattern_type: string
  pattern_key: string
  sample_size: number
}

const toHome = (row: PatternRowForHome): HomePattern => ({
  ...(row.id ? { id: row.id } : {}),
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

/** One pattern as the constellation on the Insights home draws it. */
export interface HomeSkyPattern {
  id: string
  type: string
  key: string
  /** One per star. Empty strings when the member may see names and counts only. */
  dates: string[]
  count: number
  forming: boolean
}

export interface PatternRowForSky extends PatternRowForHome {
  id: string
  evidence?: unknown
}

/** Stars drawn for a pattern whose entry dates are withheld. */
const MAX_UNDATED_STARS = 9

function evidenceDates(evidence: unknown): string[] {
  if (!Array.isArray(evidence)) return []
  return evidence.flatMap((item) => {
    const date = item && typeof item === 'object' ? (item as Record<string, unknown>).entry_date : null
    return typeof date === 'string' ? [date] : []
  })
}

/**
 * The member's patterns for the home constellation, most written-under first.
 * With `withDates` false (no Stelloquy access) each star carries no date:
 * names and counts only, as the Patterns preview shows.
 */
export function skyPatternsForHome(rows: PatternRowForSky[], opts: { withDates: boolean }, limit = 8): HomeSkyPattern[] {
  return [...rows]
    .sort(byEntries)
    .map((row) => ({
      id: row.id,
      type: row.pattern_type,
      key: row.pattern_key,
      dates: opts.withDates ? evidenceDates(row.evidence) : Array.from({ length: Math.min(row.sample_size, MAX_UNDATED_STARS) }, () => ''),
      count: row.sample_size,
      forming: row.sample_size < ESTABLISHED_PATTERN_MIN_SAMPLE,
    }))
    .filter((pattern) => pattern.dates.length > 0)
    .slice(0, limit)
}

export const timesWritten = (n: number) => (n === 1 ? 'written under once' : `written under ${n} times`)

/** The Patterns page, at one pattern when its id is known. */
export function patternHref(id?: string): string {
  return id ? `/insights/map#pattern-${id}` : '/insights/map'
}

/**
 * For Today's transit list: how many entries the member has written under
 * each transit, keyed as "Planet:aspect:NatalPlanet". Only skies written
 * under at least twice.
 */
export function writtenUnderTransits(rows: PatternRowForHome[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) {
    if (row.pattern_type === 'aspect' && row.sample_size >= MIN_ENTRIES) out[row.pattern_key] = row.sample_size
  }
  return out
}

/** For Today's "shape of today": the moon and retrograde skies overhead that the member has written under. Transits have their own list. */
export function overheadMoonAndRetrogrades(rows: PatternRowForHome[], day: EphemerisDay | null | undefined, limit = 3): HomePattern[] {
  return overheadPatterns(rows.filter((row) => row.pattern_type !== 'aspect'), day, limit)
}
