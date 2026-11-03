import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'
import { monthNameAfterPeriod, periodLabel, periodMonthNameOnly } from '@/lib/period-review/periods'

export function assemblePeriodReviewSystemPrompt(): string {
  return `You are Stella, the voice of Kiaros. You write short period-end look backs for a single closed calendar month or quarter.

Write in a workshop "we" voice. Calm, warm, plain words. You are a companion looking back with the member, not a coach or authority.

Rules:
1. Pattern, not prophecy. Describe what happened and which sky patterns were present. Never predict. Never say a transit caused anything. Never use "will", "destined", "meant to", or "the universe".
2. No authority. Frame astrology as a lens ("astrologers often read...", "one way to see it..."). Never "this proves" or "the truth is".
3. Never tell the member what they need or must do. A forward-looking line is only ever an open question, such as "You wrote about feeling stuck at work the same week Saturn crossed your Jupiter. What steadied you, if anything?"
4. Reflect their own words back. Quote or paraphrase journal entries briefly and accurately. Never invent feelings, events, or quotes.
5. Plans and goals are neutral. Unfinished items are "still open", never "missed" or "behind".
6. No ampersands and no em dashes. Avoid "actually", "genuinely", and tidy three-item lists.
7. Keep it short. Use these section titles on their own lines when you have data for them: "The sky", "Your plans and goals", "In your words", "A question to carry". Omit any section with no data.
8. No praise inflation, hype, or self-help language.
9. When ingresses (planet sign changes) are provided with dates, you may note in "The sky" where a dated journal entry, task, or mood shift falls near an ingress date. State only the date proximity—pattern, not prophecy. No causal language.
10. "A question to carry" must name one concrete thing from this period, taken from the user message: a dated sky overlap (for example a transit or ingress with its date), a journal theme in the member's own words, an intention they set, or a task they finished or that is still open. Phrase it as one open question. No prediction, no advice, and no causal wording. A question that could be asked of any month, such as "What from October would you like to carry forward?", is too generic; leave the section out rather than write one.
11. "Saved from Stelloquy" items are moments the member chose to keep from their Stelloquy conversations. Each is labelled with whose words it is. Only items labelled as the member's words may be quoted or paraphrased as theirs. For items labelled as Stelloquy's words, say the member saved or held on to that reflection; never present those words as the member's own. These items may appear in "In your words".

If there are zero journal entries and no "Saved from Stelloquy" items in the user message, do not mention the absence of journal entries. Do not include "In your words". The app handles that case separately.

Never invent journal quotes, tasks, transits, or goals that are not in the user message.`
}

export interface LookBackPromptOptions {
  /** Replaces the calendar label, e.g. "Mercury retrograde (in Scorpio, Oct 25 to Nov 14)". */
  title?: string
  /** What comes next, for "A question to carry". null leaves it out. */
  carryLabel?: string | null
  /** Extra facts about the window, placed before the sky block. */
  context?: string
}

export function assemblePeriodReviewUserPrompt(
  sources: PeriodReviewSourceBundle,
  options: LookBackPromptOptions = {},
): string {
  const title = options.title ?? periodLabel(sources.period)
  const carryMonth = options.carryLabel === undefined ? monthNameAfterPeriod(sources.period) : options.carryLabel

  const ingressBlock =
    sources.sky.ingresses.length > 0
      ? sources.sky.ingresses.map((ing) => `  - ${ing.date}: ${ing.planet} → ${ing.sign}`).join('\n')
      : '  (none)'

  const checkInBlock =
    sources.checkIns.length > 0
      ? sources.checkIns
          .map((c) => {
            const parts = [c.date]
            if (c.mood) parts.push(`mood: ${c.mood}`)
            if (c.energy !== null && c.energy !== undefined) parts.push(`energy: ${c.energy}`)
            return `  - ${parts.join(', ')}`
          })
          .join('\n')
      : '  (none)'

  const intentionsBlock =
    sources.intentions.length > 0
      ? sources.intentions.map((text, i) => `  ${i + 1}. ${text}`).join('\n')
      : null

  const journalBlock =
    sources.journalEntryCount > 0
      ? sources.journalExcerpts.map((e, i) => `  ${i + 1}. ${e.date}: ${e.excerpt}`).join('\n')
      : null

  const captureExcerpts = sources.captureExcerpts ?? []
  const captureBlock =
    captureExcerpts.length > 0
      ? captureExcerpts
          .map(
            (c, i) =>
              `  ${i + 1}. ${c.date} (${c.whose === 'member' ? "the member's own words" : "Stelloquy's words, saved by the member"}): ${c.excerpt}`,
          )
          .join('\n')
      : null

  const completedBlock =
    sources.planTasksCompleted.length > 0
      ? sources.planTasksCompleted.map((t) => `  - ${t.date}: ${t.title}`).join('\n')
      : '  (none recorded)'

  const openBlock =
    sources.planTasksOpen.length > 0
      ? sources.planTasksOpen.map((t) => `  - ${t.date}: ${t.title}`).join('\n')
      : '  (none recorded)'

  const goalsLabel = sources.goalsCompletedApproximate
    ? 'Goals marked completed during period (approximate, based on last-updated date)'
    : 'Goals marked completed during period'

  return `Write a period look back for ${title} (${sources.period.periodStart} through ${sources.period.periodEnd}).

Member name: ${sources.displayName}
${options.context ? `\n${options.context}\n` : ''}
Sky for the period (from ephemeris):
${sources.sky.text}

Ingresses (planet sign changes):
${ingressBlock}

Blueprint context:
  Month theme: ${sources.monthBlueprintTheme ?? '(none)'}
  Quarter theme: ${sources.quarterBlueprintTheme ?? '(none)'}

Check-ins:
  Daily check-in days: ${sources.dailyLogDays}
${checkInBlock}

${intentionsBlock ? `Intentions set during period:\n${intentionsBlock}\n\n` : ''}Plans:
  Plan items scheduled: ${sources.planTasksTotal}
  Completed tasks:
${completedBlock}
  Still open tasks:
${openBlock}

Goals:
  Active goals now: ${sources.goalsActive}
  ${goalsLabel}: ${sources.goalsCompletedInPeriod}

${
  journalBlock
    ? `Journal excerpts (${sources.journalEntryCount} eligible entries):
${journalBlock}`
    : 'Journal excerpts: (none provided — do not mention this in your output)'
}
${captureBlock ? `\nSaved from Stelloquy (${sources.captureCount ?? captureExcerpts.length} saved during the period):\n${captureBlock}\n` : ''}

If you include "A question to carry", make it one open question only. It must name one concrete thing listed above (a dated sky overlap, a journal theme, an intention, or a completed or still open task)${
    carryMonth ? `, and may ask what the member would like to do with that one thing in ${carryMonth}` : ''
  }. Never a generic question that would fit any period.`
}
