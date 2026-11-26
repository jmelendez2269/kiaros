/**
 * The Recent entries list under the Journal editor. Pure: no server imports.
 * Run tests: node --test lib/journal/__tests__/recent-entries.test.ts
 */

export interface RecentEntrySource {
  id: string
  title: string | null
  body: string
  entry_date: string
  lunar_phase: string | null
  lunar_sign: string | null
  include_in_insights: boolean | null
  include_in_stelloquy: boolean | null
}

export interface RecentEntryRow {
  id: string
  /** "Thu 12 Nov" */
  dateLabel: string
  /** "Waxing Crescent · Sagittarius", or null when the entry has no stored sky. */
  sky: string | null
  title: string
  excerpt: string
  /** Who may read it, in the board's words. */
  consent: string
}

const EXCERPT_MAX = 140

function titleCasePhase(phase: string): string {
  return phase
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

export function entryDateLabel(dateISO: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${dateISO}T12:00:00Z`),
  )
}

export function entrySkyLabel(entry: Pick<RecentEntrySource, 'lunar_phase' | 'lunar_sign'>): string | null {
  const parts = [entry.lunar_phase ? titleCasePhase(entry.lunar_phase) : null, entry.lunar_sign || null].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export function entryConsentLabel(entry: Pick<RecentEntrySource, 'include_in_insights' | 'include_in_stelloquy'>): string {
  const insights = entry.include_in_insights === true
  const stelloquy = entry.include_in_stelloquy === true
  if (insights && stelloquy) return 'In Insights · Stelloquy remembers'
  if (insights) return 'In Insights'
  if (stelloquy) return 'Stelloquy remembers'
  return 'Only you'
}

export function entryExcerpt(body: string, max = EXCERPT_MAX): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function recentEntryRow(entry: RecentEntrySource): RecentEntryRow {
  const excerpt = entryExcerpt(entry.body)
  return {
    id: entry.id,
    dateLabel: entryDateLabel(entry.entry_date),
    sky: entrySkyLabel(entry),
    title: entry.title?.trim() || 'Untitled',
    excerpt,
    consent: entryConsentLabel(entry),
  }
}
