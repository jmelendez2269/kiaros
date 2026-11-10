/**
 * "A new reflection is ready": which reflection is announced, what the
 * notice says, and where it leads. Pure, so the API, the notice and the
 * tests share one definition.
 */
import type { PeriodKind } from './periods'

export interface UnseenReflection {
  kind: PeriodKind
  /** First day of the period (YYYY-MM-DD). */
  start: string
  /** The day after the period's last day (YYYY-MM-DD), as reflections store it. */
  end: string
  status: string
  /** Whether the report carries a sky reading. */
  hasSky: boolean
}

export interface ReflectionNotice {
  kind: PeriodKind
  start: string
  /** Other new reflections besides this one. */
  more: number
}

/** A reflection is announced only while its period is recent, so catching up on old periods stays quiet. */
export const ANNOUNCE_WITHIN_DAYS = 45

/** Sent by the Reflections page when it opens, so a notice already on screen steps aside. */
export const REFLECTIONS_SEEN_EVENT = 'kairos:reflections-seen'

const DAY = 86_400_000

/**
 * Worth announcing: written from the member's own records, or, for a month,
 * quarter or year, read from the sky alone. A week read only from the sky is
 * not announced: it would arrive every Monday, and Today already points to it.
 */
function announces(report: UnseenReflection): boolean {
  if (report.status === 'ready') return true
  return report.status === 'empty' && report.hasSky && report.kind !== 'week'
}

/** The newest reflection to announce, and how many others are new. null when there is nothing to say. */
export function pickReflectionNotice(reports: UnseenReflection[], today: string): ReflectionNotice | null {
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - ANNOUNCE_WITHIN_DAYS * DAY).toISOString().slice(0, 10)
  const fresh = reports
    .filter((report) => announces(report) && report.end >= cutoff)
    // The period that closed most recently leads; of two closing together, the longer one.
    .sort((a, b) => b.end.localeCompare(a.end) || a.start.localeCompare(b.start))
  if (!fresh.length) return null
  return { kind: fresh[0].kind, start: fresh[0].start, more: fresh.length - 1 }
}

const day = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

/** e.g. "Your reflection on the week of Nov 2 is ready." */
export function reflectionNoticeText(notice: ReflectionNotice): string {
  const year = notice.start.slice(0, 4), month = Number(notice.start.slice(5, 7))
  const lead =
    notice.kind === 'year' ? `Your ${year} Unwrapped is ready.`
    : notice.kind === 'quarter' ? `Your reflection on Q${Math.ceil(month / 3)} is ready.`
    : notice.kind === 'month' ? `Your reflection on ${day(notice.start, { month: 'long' })} is ready.`
    : `Your reflection on the week of ${day(notice.start, { month: 'short', day: 'numeric' })} is ready.`
  if (notice.more === 0) return lead
  return `${lead} ${notice.more === 1 ? 'One more is' : `${notice.more} more are`} waiting too.`
}

/** Straight to that reflection. The Reflections page forwards it when the journal holds look backs. */
export function reflectionNoticeHref(notice: Pick<ReflectionNotice, 'kind' | 'start'>): string {
  return `/reflections?kind=${notice.kind}&start=${notice.start}`
}

/** Pages where the notice would only repeat what is already in front of the member. */
export function noticeHiddenOn(pathname: string, notice: Pick<ReflectionNotice, 'kind' | 'start'>, lastWeekOnToday: string | null): boolean {
  if (pathname.startsWith('/reflections') || pathname.startsWith('/journal/look-back') || pathname.startsWith('/year/unwrapped')) return true
  // Today's "Last week" card is already pointing at this same week.
  return pathname === '/today' && notice.kind === 'week' && notice.start === lastWeekOnToday
}
