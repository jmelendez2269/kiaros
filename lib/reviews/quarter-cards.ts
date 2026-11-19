/** Pure text for the four quarter cards on Reviews. No server imports, so it is unit-testable. */
import { monthName, shortDay, type TimelineQuarter } from './year-timeline'

export interface QuarterCard {
  index: number
  range: string
  status: string
  /** Only a quarter that has closed can be opened for review. */
  openable: boolean
  current: boolean
}

const dayMs = 86_400_000

export function quarterCards(quarters: TimelineQuarter[], today: string): QuarterCard[] {
  return quarters.map((q) => {
    const range = `Q${q.index} · ${monthName(q.index * 3 - 2).slice(0, 3)} — ${monthName(q.index * 3).slice(0, 3)}`
    if (q.state === 'open') {
      const week = Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${q.start}T12:00:00Z`)) / dayMs / 7) + 1
      return { index: q.index, range, status: `Week ${Math.min(week, 13)} of 13 · closes ${shortDay(q.end)}`, openable: false, current: true }
    }
    if (q.state === 'future') return { index: q.index, range, status: 'Not yet', openable: false, current: false }
    return { index: q.index, range, status: q.state === 'read' ? 'Looked back on' : 'Ready to look back on', openable: true, current: false }
  })
}
