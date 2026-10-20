import { getWeekDates } from '@/components/calendar/utils'

export function weekRangeLabel(selectedDate: string): string {
  const weekDates = getWeekDates(selectedDate)
  const first = new Date(`${weekDates[0]}T12:00:00`)
  const last = new Date(`${weekDates[6]}T12:00:00`)
  return `${first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${last.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`
}
