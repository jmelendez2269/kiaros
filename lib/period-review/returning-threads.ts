/**
 * Threads a member has met before, for a look back: skies overhead in the
 * period that they have already written under (from Patterns), and themes in
 * the period's saved Stelloquy conversations (from the Mind map).
 *
 * Only names, counts and dates leave here. The readings and entries behind a
 * pattern stay on the Patterns page, so a look back never carries words drawn
 * from another period's journal.
 *
 * Pure: no server imports, so it is unit-testable.
 */
import type { EphemerisDay } from '@/types/blueprint'
import { dayMatchesPattern, patternTitle } from '../insights/pattern-sky'

export interface ReturningPattern {
  label: string
  /** Entries the member has written under this sky, across all time. */
  entries: number
  firstSeen: string | null
  lastSeen: string | null
}

export interface ReturningTheme {
  label: string
  kind: 'theme' | 'mood'
  /** Saved conversations in this period tagged with it. */
  inPeriod: number
  /** Saved conversations tagged with it across all time. */
  overall: number
}

export interface ReturningThreads {
  patterns: ReturningPattern[]
  themes: ReturningTheme[]
}

export interface PatternRowForThreads {
  pattern_type: string
  pattern_key: string
  sample_size: number
  first_seen: string | null
  last_seen: string | null
  evidence: unknown
}

/** A pattern needs this many entries before a look back calls it a return. */
export const RETURNING_PATTERN_MIN_ENTRIES = 4
const MAX_PATTERNS = 3
const MAX_THEMES = 4
/** Past this length every moon phase and moon sign has come round, so they say nothing about the period. */
const LUNAR_WINDOW_DAYS = 14

function evidenceDates(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    item && typeof item === 'object' && typeof (item as Record<string, unknown>).entry_date === 'string'
      ? [String((item as Record<string, unknown>).entry_date).slice(0, 10)]
      : [],
  )
}

/**
 * Established patterns whose sky was overhead in the window. In a window
 * longer than two weeks, moon phase and moon sign patterns count only when
 * the member wrote under them in the window itself.
 */
export function selectReturningPatterns(
  rows: PatternRowForThreads[],
  days: EphemerisDay[],
  window: { periodStart: string; periodEnd: string },
): ReturningPattern[] {
  const inWindow = days.filter((d) => d.date >= window.periodStart && d.date <= window.periodEnd)
  const lengthDays = Math.round((Date.parse(window.periodEnd) - Date.parse(window.periodStart)) / 86_400_000) + 1
  return rows
    .filter((row) => row.sample_size >= RETURNING_PATTERN_MIN_ENTRIES)
    .filter((row) => inWindow.some((day) => dayMatchesPattern(day, row.pattern_type, row.pattern_key)))
    .filter((row) => {
      const lunar = row.pattern_type === 'lunar_phase' || row.pattern_type === 'lunar_sign'
      if (!lunar || lengthDays <= LUNAR_WINDOW_DAYS) return true
      return evidenceDates(row.evidence).some((date) => date >= window.periodStart && date <= window.periodEnd)
    })
    .sort((a, b) => b.sample_size - a.sample_size || a.pattern_key.localeCompare(b.pattern_key))
    .slice(0, MAX_PATTERNS)
    .map((row) => ({
      label: patternTitle(row.pattern_type, row.pattern_key),
      entries: row.sample_size,
      firstSeen: row.first_seen ? row.first_seen.slice(0, 10) : null,
      lastSeen: row.last_seen ? row.last_seen.slice(0, 10) : null,
    }))
}

/** Themes and moods tagged on the period's saved conversations, most frequent first, with their all-time counts. */
export function selectReturningThemes(
  periodTopics: Array<{ capture_id: string; kind: string; label: string }>,
  overallCounts: ReadonlyMap<string, number>,
): ReturningTheme[] {
  const captures = new Map<string, { kind: 'theme' | 'mood'; label: string; ids: Set<string> }>()
  for (const topic of periodTopics) {
    if (topic.kind !== 'theme' && topic.kind !== 'mood') continue
    const key = `${topic.kind}:${topic.label}`
    const entry = captures.get(key) ?? { kind: topic.kind, label: topic.label, ids: new Set<string>() }
    entry.ids.add(topic.capture_id)
    captures.set(key, entry)
  }
  return [...captures.entries()]
    .map(([key, entry]) => ({ label: entry.label, kind: entry.kind, inPeriod: entry.ids.size, overall: Math.max(entry.ids.size, overallCounts.get(key) ?? 0) }))
    // A theme seen only in this period is not a return.
    .filter((theme) => theme.overall > theme.inPeriod)
    .sort((a, b) => b.overall - a.overall || b.inPeriod - a.inPeriod || a.label.localeCompare(b.label))
    .slice(0, MAX_THEMES)
}

const times = (n: number) => (n === 1 ? 'once' : `${n} times`)

export function chipReturningPattern(pattern: ReturningPattern): string {
  return `${pattern.label} · written under ${times(pattern.entries)}`
}

export function chipReturningTheme(theme: ReturningTheme): string {
  return `${theme.label} · in ${theme.overall} saved conversations`
}

const monthYear = (date: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

/** The block added to the look back prompt. Empty string when there is nothing to say. */
export function returningThreadsPromptBlock(threads: ReturningThreads | undefined): string {
  if (!threads || (threads.patterns.length === 0 && threads.themes.length === 0)) return ''
  const lines: string[] = ['Threads the member has met before (from their Patterns and Mind map):']
  if (threads.patterns.length) {
    lines.push('  Skies overhead in this period that they have written under before:')
    for (const p of threads.patterns) {
      const span = p.firstSeen && p.lastSeen ? `, first in ${monthYear(p.firstSeen)}, most recently in ${monthYear(p.lastSeen)}` : ''
      lines.push(`    - ${p.label}: ${p.entries} journal entries across all time${span}`)
    }
  }
  if (threads.themes.length) {
    lines.push('  Themes in the Stelloquy conversations saved this period that have come up before:')
    for (const t of threads.themes) {
      lines.push(`    - ${t.label} (${t.kind}): ${t.inPeriod} this period, ${t.overall} across all saved conversations`)
    }
  }
  return lines.join('\n')
}
