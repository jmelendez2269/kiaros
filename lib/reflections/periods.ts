export type PeriodKind = 'month' | 'quarter' | 'year'
export interface ReflectionPeriod { kind: PeriodKind; start: string; end: string; timezone: string }
export function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return value.length <= 100 } catch { return false }
}
export function localDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant)
  const get = (key: string) => parts.find(p => p.type === key)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export function periodFor(kind: PeriodKind, year: number, index: number, timezone: string): ReflectionPeriod {
  if (!validTimezone(timezone) || !Number.isInteger(year) || year < 2000 || year > 2100 ||
      !Number.isInteger(index) || index < 1 || index > (kind === 'month' ? 12 : kind === 'quarter' ? 4 : 1)) throw new Error('Invalid reflection period')
  const month = kind === 'month' ? index - 1 : kind === 'quarter' ? (index - 1) * 3 : 0
  const length = kind === 'month' ? 1 : kind === 'quarter' ? 3 : 12
  return { kind, start: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(year, month + length, 1)).toISOString().slice(0, 10), timezone }
}
export function latestClosed(kind: PeriodKind, timezone: string, now = new Date()): ReflectionPeriod {
  const [year, month] = localDate(now, timezone).split('-').map(Number)
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
  if (period.kind === 'quarter') return `Q${Math.ceil(month / 3)} ${year}`
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(period.start + 'T12:00:00Z'))
}
