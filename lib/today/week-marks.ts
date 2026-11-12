/**
 * Marks on Today's week ribbon: the days of this week the member wrote in
 * their journal or checked in. Pure, so it is unit-testable.
 *
 * Only days that have something are marked. A day without a mark is not a
 * missed day and is never styled as one.
 */

export interface DayMark {
  wrote: boolean
  checkedIn: boolean
}

/** By date (YYYY-MM-DD). Only days up to today, and only days with at least one mark. */
export function weekMarks(
  weekDates: string[],
  today: string,
  journalDates: Array<string | null | undefined>,
  checkIns: Array<{ log_date: string; energy_level: number | null; mood_tag: string | null }>,
): Record<string, DayMark> {
  const inWeek = new Set(weekDates.filter((date) => date <= today))
  const wrote = new Set(journalDates.flatMap((date) => (date ? [date.slice(0, 10)] : [])))
  // An untouched or cleared check-in row is not a check-in.
  const checkedIn = new Set(checkIns.filter((row) => row.energy_level !== null || !!row.mood_tag).map((row) => row.log_date.slice(0, 10)))
  const out: Record<string, DayMark> = {}
  for (const date of inWeek) {
    const mark = { wrote: wrote.has(date), checkedIn: checkedIn.has(date) }
    if (mark.wrote || mark.checkedIn) out[date] = mark
  }
  return out
}

/** For screen readers, e.g. "wrote and checked in". null when there is nothing to say. */
export function dayMarkLabel(mark: DayMark | undefined): string | null {
  if (!mark) return null
  const parts = [mark.wrote ? 'wrote' : null, mark.checkedIn ? 'checked in' : null].filter(Boolean)
  return parts.length ? parts.join(' and ') : null
}
