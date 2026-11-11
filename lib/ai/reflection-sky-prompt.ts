import type { PeriodKind } from '@/lib/reflections/periods'

const SPAN: Record<PeriodKind, string> = {
  week: 'one week, Monday to Sunday',
  month: 'one calendar month',
  quarter: 'one quarter',
  year: 'one whole year',
}

/**
 * Added to the look back system prompt when it writes the sky part of a
 * reflection. Two cases: a period the member recorded nothing in, where the
 * sky carries the look back, and a period that already has a reflection
 * written from their own words, where the sky sits beside it. `soFar` is a
 * year read while it is still under way.
 */
export function skyReadingAddendum(kind: PeriodKind, hasLivedReflection: boolean, soFar = false): string {
  const span = `This look back covers ${soFar ? 'a year still under way, from January 1 to the last date given. Read only those dates, and say nothing about how the year ends' : SPAN[kind]}.${kind === 'year' ? ' Stay with the two or three slowest transits to the member\'s own chart and the arc they trace across the year; "sky" may run to 120 words.' : ''}`
  if (hasLivedReflection) {
    return `${span}
A separate reflection, shown beside this one, already covers what the member wrote and did. Do not write "thread" or "plansAndGoals". Write only "sky": one paragraph on the one or two transits whose meaning speaks to what they recorded, as a way of reading it. "questionToCarry" is optional.`
  }
  return `${span}
The member recorded little or nothing of their own in these dates. Time still moved through their chart, and this look back says how. For this look back only, these replace the usual guidance:
- "sky" is the heart of it and may stand on its own. One or two short paragraphs: what was moving through the member's own chart in these dates, then the wider sky, each in plain words using the meanings provided. Name at most three transits. Describe what each is often read as a season of, never what the member felt or did.
- Never mention that nothing was written, logged or recorded, and never explain it. Unrecorded time is not a gap. Do not guess at why, and do not suggest rest, busyness or anything else as the reason.
- Write "thread" only when check-ins, intentions or plans are listed and say something together with the sky. Otherwise leave it out.
- "plansAndGoals" only when plan items are listed, in one neutral sentence.
- "questionToCarry" may name one dated transit and ask what, if anything, the member remembers of those days.`
}
