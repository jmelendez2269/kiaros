/**
 * Pure URL helpers for NEXT_PUBLIC_IA_JOURNAL (unit-tested; no server-only imports).
 */

import { featureFlagEnabled } from '@/lib/calendar/calendar-day-routes'

export type JournalTabKey = 'write' | 'entries' | 'patterns' | 'look-back'

export type PatternsSubView = 'patterns' | 'map' | 'captures'

export type LookBackSubView = 'month' | 'quarter' | 'year'

export function iaJournalFlagEnabled(value: string | undefined): boolean {
  return featureFlagEnabled(value)
}

export function journalTabWriteHref(): string {
  return '/journal'
}

export function journalTabEntriesHref(): string {
  return '/journal/entries'
}

export function journalTabPatternsHref(view?: PatternsSubView): string {
  if (!view || view === 'patterns') return '/journal/patterns'
  return `/journal/patterns?view=${view}`
}

export function journalTabLookBackHref(view?: LookBackSubView): string {
  if (!view || view === 'month') return '/journal/look-back'
  return `/journal/look-back?view=${view}`
}

export function resolveJournalTabKey(pathname: string): JournalTabKey {
  if (pathname === '/journal/entries' || pathname.startsWith('/journal/entries/')) {
    return 'entries'
  }
  if (pathname === '/journal/patterns' || pathname.startsWith('/journal/patterns/')) {
    return 'patterns'
  }
  if (pathname === '/journal/look-back' || pathname.startsWith('/journal/look-back/')) {
    return 'look-back'
  }
  return 'write'
}

export function resolvePatternsSubView(raw: string | null | undefined): PatternsSubView {
  if (raw === 'map' || raw === 'captures') return raw
  return 'patterns'
}

export function resolveLookBackSubView(raw: string | null | undefined): LookBackSubView {
  if (raw === 'quarter' || raw === 'year') return raw
  return 'month'
}

export function patternsSubViewHref(pathname: string, params: URLSearchParams, view: PatternsSubView): string {
  const sp = new URLSearchParams(params.toString())
  if (view === 'patterns') {
    sp.delete('view')
  } else {
    sp.set('view', view)
  }
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function lookBackSubViewHref(pathname: string, params: URLSearchParams, view: LookBackSubView): string {
  const sp = new URLSearchParams(params.toString())
  if (view === 'month') {
    sp.delete('view')
  } else {
    sp.set('view', view)
  }
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/** Legacy vs IA journal routes (call from server or pass flag from server to client). */
export function patternsPageHref(iaJournalEnabled: boolean, view?: PatternsSubView): string {
  if (!iaJournalEnabled) {
    if (view === 'map') return '/insights/map?tab=map'
    if (view === 'captures') return '/insights/map?tab=captures'
    return '/insights/map'
  }
  return journalTabPatternsHref(view)
}

export function journalEntriesListHref(iaJournalEnabled: boolean): string {
  return iaJournalEnabled ? journalTabEntriesHref() : '/insights/map'
}

export function reflectionsHubHref(iaJournalEnabled: boolean, view?: LookBackSubView): string {
  if (!iaJournalEnabled) {
    if (view === 'year') return '/year/unwrapped'
    return '/reflections'
  }
  return journalTabLookBackHref(view)
}

export function quarterlyReviewHref(iaJournalEnabled: boolean, quarter?: number): string {
  if (!iaJournalEnabled) {
    const base = '/year?view=review'
    return quarter ? `${base}&quarter=${quarter}` : base
  }
  const base = journalTabLookBackHref('quarter')
  if (!quarter) return base
  const sp = new URLSearchParams({ view: 'quarter', quarter: String(quarter) })
  return `${base.split('?')[0]}?${sp.toString()}`
}
