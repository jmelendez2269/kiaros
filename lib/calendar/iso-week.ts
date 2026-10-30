/**
 * Calculate ISO 8601 week number for a given date.
 * Week 1 is the first week with at least 4 days in the new year.
 * Weeks start on Monday.
 */
export function getISOWeek(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(`${date}T12:00:00`) : new Date(date)
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
