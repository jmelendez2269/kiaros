/**
 * Marks for the calendar month grid. Pure: no server imports.
 * Run tests: npx tsx --test lib/year/__tests__/month-marks.test.ts
 */
import type { SkyCycle } from '@/lib/sky-cycles/types'

/** Day-of-month (1-indexed) to the planets retrograde that day, for one month. */
export function retrogradePlanetsByDay(cycles: Pick<SkyCycle, 'kind' | 'planet' | 'startDate' | 'endDate'>[], year: number, month0: number): Map<number, string[]> {
  const out = new Map<number, string[]>()
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
  const prefix = `${year}-${String(month0 + 1).padStart(2, '0')}-`
  for (const cycle of cycles) {
    if (cycle.kind !== 'retrograde' || !cycle.planet) continue
    for (let d = 1; d <= days; d++) {
      const iso = `${prefix}${String(d).padStart(2, '0')}`
      if (iso < cycle.startDate || iso > cycle.endDate) continue
      const planets = out.get(d) ?? []
      if (!planets.includes(cycle.planet)) planets.push(cycle.planet)
      out.set(d, planets)
    }
  }
  return out
}

/** Day-of-month values for rows dated inside the month's prefix ("2026-11-"). */
export function daysOfMonth(dates: Array<string | null | undefined>, monthPrefix: string): Set<number> {
  const out = new Set<number>()
  for (const date of dates) {
    if (!date || !date.startsWith(monthPrefix)) continue
    const d = Number(date.slice(8, 10))
    if (Number.isFinite(d)) out.add(d)
  }
  return out
}
