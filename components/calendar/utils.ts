export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const SHORT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Returns ISO date strings for the Mon–Sun week containing the given date. */
export function getWeekDates(date: string): string[] {
  const d = new Date(date)
  const dayOfWeek = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayOfWeek)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

/**
 * Builds a Mon-first calendar grid for a given year/month.
 * Returns an array of ISO date strings or null for padding cells.
 * Length is always a multiple of 7.
 */
export function buildCalendarGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startPadding = (firstDay.getDay() + 6) % 7

  const grid: (string | null)[] = []
  for (let i = 0; i < startPadding; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(
      `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    )
  }
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}
