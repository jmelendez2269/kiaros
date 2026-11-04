export type PeriodKind = 'week' | 'month' | 'quarter' | 'year'
export interface ReflectionPeriod { kind: PeriodKind; start: string; end: string; timezone: string }
export function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return value.length <= 100 } catch { return false }
}
export function localDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant)
  const get = (key: string) => parts.find(p => p.type === key)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
const DAY = 86400000
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export function addDays(date: string, days: number): string { return isoDay(Date.parse(date + 'T00:00:00Z') + days * DAY) }
// Weeks run Monday to Sunday and are numbered as ISO weeks: week 1 is the week holding January 4.
function weekOneMonday(year: number): number {
  const jan4 = Date.UTC(year, 0, 4)
  return jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * DAY
}
export function weeksInYear(year: number): number { return Math.round((weekOneMonday(year + 1) - weekOneMonday(year)) / (7 * DAY)) }
/** The ISO week (year and number) holding a calendar date. */
export function weekOf(date: string): { year: number; index: number } {
  const ms = Date.parse(date + 'T00:00:00Z')
  let year = Number(date.slice(0, 4))
  if (ms < weekOneMonday(year)) year--
  else if (ms >= weekOneMonday(year + 1)) year++
  return { year, index: Math.floor((ms - weekOneMonday(year)) / (7 * DAY)) + 1 }
}
export function periodFor(kind: PeriodKind, year: number, index: number, timezone: string): ReflectionPeriod {
  if (!validTimezone(timezone) || !Number.isInteger(year) || year < 2000 || year > 2100 ||
      !Number.isInteger(index) || index < 1 || index > (kind === 'week' ? weeksInYear(year) : kind === 'month' ? 12 : kind === 'quarter' ? 4 : 1)) throw new Error('Invalid reflection period')
  if (kind === 'week') {
    const start = weekOneMonday(year) + (index - 1) * 7 * DAY
    return { kind, start: isoDay(start), end: isoDay(start + 7 * DAY), timezone }
  }
  const month = kind === 'month' ? index - 1 : kind === 'quarter' ? (index - 1) * 3 : 0
  const length = kind === 'month' ? 1 : kind === 'quarter' ? 3 : 12
  return { kind, start: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(year, month + length, 1)).toISOString().slice(0, 10), timezone }
}
export function latestClosed(kind: PeriodKind, timezone: string, now = new Date()): ReflectionPeriod {
  const today = localDate(now, timezone)
  if (kind === 'week') {
    const monday = addDays(today, -((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7))
    const last = weekOf(addDays(monday, -7))
    return periodFor(kind, last.year, last.index, timezone)
  }
  const [year, month] = today.split('-').map(Number)
  if (kind === 'year') return periodFor(kind, year - 1, 1, timezone)
  if (kind === 'month') return periodFor(kind, month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1, timezone)
  const quarter = Math.ceil(month / 3)
  return periodFor(kind, quarter === 1 ? year - 1 : year, quarter === 1 ? 4 : quarter - 1, timezone)
}
export function assertClosed(period: ReflectionPeriod, now = new Date()): void {
  if (period.end > localDate(now, period.timezone)) throw new Error('This period has not ended yet')
}
// Find the first instant belonging to a local date. Handles DST and midnight offset transitions.
export function localBoundary(date: string, timezone: string): string {
  const nominal = Date.parse(date + 'T00:00:00Z')
  let low = nominal - 48 * 3600000, high = nominal + 48 * 3600000
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (localDate(new Date(mid), timezone) < date) low = mid + 1
    else high = mid
  }
  return new Date(low).toISOString()
}
export function periodLabel(period: ReflectionPeriod): string {
  const year = Number(period.start.slice(0, 4)), month = Number(period.start.slice(5, 7))
  if (period.kind === 'year') return `${year} Unwrapped`
  if (period.kind === 'week') return 'Week of ' + new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(period.start + 'T12:00:00Z'))
  if (period.kind === 'quarter') return `Q${Math.ceil(month / 3)} ${year}`
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(period.start + 'T12:00:00Z'))
}
/** The period of this kind holding a calendar date. */
export function periodContaining(kind: PeriodKind, date: string, timezone: string): ReflectionPeriod {
  if (kind === 'week') { const w = weekOf(date); return periodFor(kind, w.year, w.index, timezone) }
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7))
  return periodFor(kind, year, kind === 'month' ? month : kind === 'quarter' ? Math.ceil(month / 3) : 1, timezone)
}
/** Every ended period of this kind that overlaps [since, now], newest first. */
export function closedPeriodsSince(kind: PeriodKind, since: string, timezone: string, now = new Date()): ReflectionPeriod[] {
  const out: ReflectionPeriod[] = []
  let period = latestClosed(kind, timezone, now)
  while (period.end > since) {
    out.push(period)
    try { period = periodContaining(kind, addDays(period.start, -1), timezone) }
    catch { break } // before 2000: outside the supported range
  }
  return out
}
/** Newest of each kind first, then the next newest of each, and so on. */
export function catchUpOrder(lists: ReflectionPeriod[][]): ReflectionPeriod[] {
  const out: ReflectionPeriod[] = []
  for (let i = 0; i < Math.max(0, ...lists.map(l => l.length)); i++) for (const list of lists) if (list[i]) out.push(list[i])
  return out
}
