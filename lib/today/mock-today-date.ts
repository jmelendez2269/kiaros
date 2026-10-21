export const MOCK_TODAY_QUERY_PARAM = 'mockToday'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Honoured only when mock dates are allowed (non-production). */
export function isMockTodayDateAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.VERCEL_ENV === 'production') return false
  return true
}

export function parseMockTodayDateParam(value: string | undefined): string | null {
  if (!value || !ISO_DATE_RE.test(value)) return null
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return value
}

export function resolveTodayDateISO(options: {
  timeZone: string
  mockToday?: string | null
  now?: Date
}): string {
  if (options.mockToday && isMockTodayDateAllowed()) {
    return options.mockToday
  }
  const now = options.now ?? new Date()
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
