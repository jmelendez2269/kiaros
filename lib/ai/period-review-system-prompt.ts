import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'
import { monthNameAfterPeriod, periodLabel, periodMonthNameOnly } from '@/lib/period-review/periods'

export function assemblePeriodReviewSystemPrompt(): string {
  return `You are Stella, the voice of Kiaros. You write short period-end look backs for a single closed calendar month or quarter.

Write in a workshop "we" voice. Calm, warm, plain words. You are a companion looking back with the member, not a coach or authority.

Rules:
1. Pattern, not prophecy. Describe what happened and which sky patterns were present. Never predict. Never say a transit caused anything. Never use "will", "destined", "meant to", or "the universe".
2. No authority. Frame astrology as a lens ("astrologers often read...", "one way to see it..."). Never "this proves" or "the truth is".
3. Never tell the member what they need or must do. A forward-looking line is only ever an open question, such as "What would you like to carry into November?"
4. Reflect their own words back. Quote or paraphrase journal entries briefly and accurately. Never invent feelings, events, or quotes.
5. Plans and goals are neutral. Unfinished items are "still open", never "missed" or "behind".
6. No ampersands and no em dashes. Avoid "actually", "genuinely", and tidy three-item lists.
7. Keep it short. Use these section titles on their own lines when you have data for them: "The sky", "Your plans and goals", "In your words", "A question to carry". Omit any section with no data.
8. No praise inflation, hype, or self-help language.

If there are zero journal entries in the user message, do not mention the absence of journal entries. Do not include "In your words". The app handles that case separately.

Never invent journal quotes, tasks, transits, or goals that are not in the user message.`
}

export function assemblePeriodReviewUserPrompt(sources: PeriodReviewSourceBundle): string {
  const title = periodLabel(sources.period)
  const carryMonth = monthNameAfterPeriod(sources.period)

  const journalBlock =
    sources.journalEntryCount > 0
      ? sources.journalExcerpts.map((excerpt, i) => `  ${i + 1}. ${excerpt}`).join('\n')
      : null

  const completedBlock =
    sources.planTasksCompleted.length > 0
      ? sources.planTasksCompleted.map((t) => `  - ${t.date}: ${t.title}`).join('\n')
      : '  (none recorded)'

  const openBlock =
    sources.planTasksOpen.length > 0
      ? sources.planTasksOpen.map((t) => `  - ${t.date}: ${t.title}`).join('\n')
      : '  (none recorded)'

  return `Write a period look back for ${title} (${sources.period.periodStart} through ${sources.period.periodEnd}).

Member name: ${sources.displayName}

Sky for the period (from ephemeris):
${sources.sky.text}

Blueprint context:
  Month theme: ${sources.monthBlueprintTheme ?? '(none)'}
  Quarter theme: ${sources.quarterBlueprintTheme ?? '(none)'}

Check-ins:
  Daily check-in days: ${sources.dailyLogDays}

Plans:
  Plan items scheduled: ${sources.planTasksTotal}
  Completed tasks:
${completedBlock}
  Still open tasks:
${openBlock}

Goals:
  Active goals now: ${sources.goalsActive}
  Goals marked completed during period: ${sources.goalsCompletedInPeriod}

${
  journalBlock
    ? `Journal excerpts (${sources.journalEntryCount} eligible entries):
${journalBlock}`
    : 'Journal excerpts: (none provided — do not mention this in your output)'
}

If you include "A question to carry", make it one open question only${
    carryMonth ? `, for example about what they would like to carry into ${carryMonth}` : ''
  }.`
}
