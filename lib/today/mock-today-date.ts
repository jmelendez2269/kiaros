export const MOCK_TODAY_QUERY_PARAM = 'mockToday'
export const MOCK_MOON_NUDGE_QUERY_PARAM = 'mockMoonNudge'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Preview/dev mocks are honoured when VERCEL_ENV is not `production`
 * (preview, development, or unset locally). Production deploys ignore mocks
 * even though NODE_ENV is `production` on Vercel builds.
 */
export function isMockTodayDateAllowed(): boolean {
  return process.env.VERCEL_ENV !== 'production'
}

export function parseMockTodayDateParam(value: string | undefined): string | null {
  if (!value || !ISO_DATE_RE.test(value)) return null
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return value
}

/** When allowed, `done` forces the moon-day nudge into its completed strip (no journal row). */
export function parseMockMoonNudgeParam(value: string | undefined): 'done' | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized === 'done' ? 'done' : null
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
