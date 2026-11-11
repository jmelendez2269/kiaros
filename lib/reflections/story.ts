/**
 * Yearly Unwrapped story frames, built only from what the year report
 * already holds. Pure, so it is unit-testable.
 */

import type { Analysis, Evidence, ReflectionContent, SkyReading } from './report-schema'

export interface StoryFrame {
  key: 'year' | 'showed-up' | 'showed' | 'turning' | 'carry' | 'overhead' | 'thread' | 'question' | 'yours'
  kicker: string
  /** The large line. */
  big: string
  small?: string
  /** A small dated line above the big one. */
  meta?: string
  /** Big numbers read differently from big sentences. */
  numeric?: boolean
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Sentences of a passage, trimmed. */
export function sentences(text: string): string[] {
  return (text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? []).map(s => s.trim()).filter(Boolean)
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))
}

/** The fullest month by recorded days, as "March with 23 days". */
export function fullestMonth(months: Array<{ month: string; days: number }>): string | null {
  const best = [...months].sort((a, b) => b.days - a.days)[0]
  if (!best || best.days === 0) return null
  return `${MONTHS[Number(best.month.slice(5, 7)) - 1] ?? best.month} with ${best.days} ${best.days === 1 ? 'day' : 'days'}`
}

/**
 * Up to five frames: your year, how often you showed up, what showed up,
 * a turning point, and one thing to carry forward. A frame without data
 * is left out rather than padded.
 */
export function buildStoryFrames(
  content: ReflectionContent,
  analysis: Pick<Analysis, 'observedDays' | 'totalDays' | 'months'> | null,
  sources: Evidence[],
): StoryFrame[] {
  const frames: StoryFrame[] = []
  const [first, second] = sentences(content.opening.text)
  if (first) frames.push({ key: 'year', kicker: 'Your year', big: first, small: second })

  if (analysis && analysis.observedDays > 0) {
    const fullest = fullestMonth(analysis.months)
    frames.push({
      key: 'showed-up', kicker: 'You showed up', big: String(analysis.observedDays), numeric: true,
      small: `${analysis.observedDays === 1 ? 'day' : 'days'} recorded, out of ${analysis.totalDays}.${fullest ? ` Your fullest month was ${fullest}.` : ''}`,
    })
  }

  const observation = content.observations[0]
  if (observation) {
    frames.push({
      key: 'showed', kicker: 'What showed up', big: observation.key.charAt(0).toUpperCase() + observation.key.slice(1).replace(/_/g, ' '),
      small: sentences(observation.text)[0],
    })
  }

  if (content.turningPoints) {
    const cited = sources.filter(s => content.turningPoints!.sources.includes(s.id) && s.authored).sort((a, b) => a.date.localeCompare(b.date))[0]
    frames.push({
      key: 'turning', kicker: 'Turning point', big: sentences(content.turningPoints.text)[0] ?? content.turningPoints.text,
      meta: cited ? `${shortDate(cited.date)} · ${cited.title}` : undefined,
    })
  }

  const carry = content.lookingAhead.experiments[0]?.text ?? sentences(content.lookingAhead.focus.text)[0]
  if (carry) frames.push({ key: 'carry', kicker: 'Carry forward', big: carry })
  return frames
}

/**
 * The story of a year with nothing recorded, told from its sky reading: how
 * the year read, what was overhead, a question to carry, and, while the year
 * is still open, what the member can add. Nothing here says or implies that
 * the member wrote nothing.
 */
export function buildSkyStoryFrames(sky: SkyReading, open: boolean): StoryFrame[] {
  const frames: StoryFrame[] = []
  const [first, second] = sentences(sky.sections.sky ?? '')
  if (first) frames.push({ key: 'year', kicker: open ? 'Your year so far' : 'Your year', big: first, small: second })

  const [lead, ...rest] = [...(sky.sourceChips.personal ?? []), ...sky.sourceChips.sky]
  if (lead) frames.push({ key: 'overhead', kicker: 'Overhead', big: lead, small: rest.slice(0, 2).join(' · ') || undefined })

  const thread = sentences(sky.sections.thread ?? '')[0]
  if (thread) frames.push({ key: 'thread', kicker: 'What it was about', big: thread })

  if (sky.sections.questionToCarry) frames.push({ key: 'question', kicker: 'A question to carry', big: sky.sections.questionToCarry })

  if (open && frames.length) {
    frames.push({
      key: 'yours', kicker: 'Yours to add', big: 'This is the sky’s side of your year.',
      small: 'What you write, check in and save is woven in each time you refresh it.',
    })
  }
  return frames
}
