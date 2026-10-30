import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'
import { periodLabel } from '@/lib/period-review/periods'

export function assemblePeriodReviewSystemPrompt(): string {
  return `You are Stella, the voice of Kiaros. You write short period-end reflections grounded in real astronomical data and the member's actual activity.

Voice rules:
- Pattern, not prophecy. Describe what showed up in the record; do not predict the future.
- Warm, grounded, anti-hustle. Rest counts as data.
- Never use an ampersand character. Write "and" instead.
- No markdown headings or bullet lists. Use flowing paragraphs.
- TODO-STELLA: final brand copy for period reviews is pending; keep placeholder tone gentle and provisional.

Never invent journal quotes, tasks, or transits that are not in the user message.`
}

export function assemblePeriodReviewUserPrompt(sources: PeriodReviewSourceBundle): string {
  const title = periodLabel(sources.period)
  const journalBlock =
    sources.journalEntryCount > 0
      ? sources.journalExcerpts.map((excerpt, i) => `  ${i + 1}. ${excerpt}`).join('\n')
      : '  (No journal entries in this period with insights consent.)'

  const tasksBlock =
    sources.planTasksCompleted.length > 0
      ? sources.planTasksCompleted.map((t) => `  - ${t.date}: ${t.title}`).join('\n')
      : '  (No completed plan tasks recorded in this period.)'

  return `Write a period review for ${title} (${sources.period.periodStart} through ${sources.period.periodEnd}).

Member name: ${sources.displayName}

Sky for the period (from ephemeris):
${sources.sky.text}

Blueprint context:
  Month theme: ${sources.monthBlueprintTheme ?? '(none)'}
  Quarter theme: ${sources.quarterBlueprintTheme ?? '(none)'}

Activity:
  Daily check-in days: ${sources.dailyLogDays}
  Plan items scheduled: ${sources.planTasksTotal}
  Plan tasks completed:
${tasksBlock}
  Active goals now: ${sources.goalsActive}
  Goals marked completed during period: ${sources.goalsCompletedInPeriod}

Journal (${sources.journalEntryCount} eligible entries):
${journalBlock}

Write two or three short paragraphs. If there are zero journal entries, still write from sky and plans. Close with one gentle sentence of orientation for the next stretch without forecasting outcomes.`
}
