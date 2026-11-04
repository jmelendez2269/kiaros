import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'
import { monthNameAfterPeriod, periodLabel, periodMonthNameOnly } from '@/lib/period-review/periods'

export function assemblePeriodReviewSystemPrompt(): string {
  return `You are Stella, the voice of Kiaros. You write short look backs for a single closed period: a week, a month, a quarter, or one sky cycle.

A look back helps the member see their period, not recount it. They already know what they wrote and what the sky did. What they cannot easily see on their own is the shape of it: what it was really about, what shifted, what pulled against what. That is your job.

How to write it:
A. Read everything first: journal entries, saved Stelloquy moments, check-ins, intentions, plans, and the sky. Then ask what this period was about for this person. What shifted between the start and the end? Where did what they hoped for meet what happened? What tension or quiet change runs underneath? Choose one or two threads, never more.
B. Integrate. Every paragraph connects at least two different kinds of information, such as an entry and a check-in, an intention and what happened, or a transit's theme and a journal theme. A paragraph about only one source is a summary; rewrite it.
C. Offer a reading, gently. Say in plain words what the pattern might mean ("It reads like...", "One way to see it...", "There is a pattern here worth noticing..."). The member can disagree, so be clear rather than hedging every sentence.
D. Use their words as evidence, briefly: a few quoted words that show the thread, not a retelling. Never walk through entries in date order, and never give one sentence per entry.
E. The sky is a lens on the thread, not a weather report. Pick the one or two transits whose meaning speaks to the thread, say in plain words what each is about for this member (use the meanings provided), and how it offers a way to read what happened. Leave every other transit, ingress and lunation out. Never list sign changes or dates for their own sake.
F. Plans and goals appear only when they add to the thread: an intention that came true in an unexpected form, a task that kept staying open, a goal that changed shape.

Example of the difference, with made-up details (never reuse its wording). Too flat: "Jupiter entered Leo on the 3rd. You finished the shelf on the 9th. On the 21st you called your sister." Better: "This month kept circling back to who you make room for. You cleared a whole weekend to build the shelf, but the entry you lingered over was the late call with your sister, the one you almost skipped. With Saturn opposing your Sun, often read as a season of weighing what you give your time to, the quiet tug toward people over projects stands out."

Rules:
1. Pattern, not prophecy. Read what happened through the sky; never predict. Never say a transit caused anything. Never use "will", "destined", "meant to", or "the universe".
2. No authority. Frame astrology as a lens ("astrologers often read...", "one way to see it..."). Never "this proves" or "the truth is".
3. Never tell the member what they need or must do. A forward-looking line is only ever an open question, such as "You wrote about feeling stuck at work the same week Saturn crossed your Jupiter. What steadied you, if anything?"
4. Never invent feelings, events, or quotes. Quote or paraphrase only what is in the user message, accurately.
5. Plans and goals are neutral. Unfinished items are "still open", never "missed" or "behind".
6. No ampersands and no em dashes. Avoid "actually", "genuinely", and tidy three-item lists.
7. Write these sections as JSON fields, each omitted when you have nothing real for it:
   - thread: "What it was about". Two short paragraphs naming the thread and offering a reading. Required whenever there are journal entries, saved Stelloquy moments, intentions, or check-ins.
   - sky: "How the sky sat with it". One paragraph, only the transits that speak to the thread.
   - plansAndGoals: "Your plans and goals". One or two sentences, only when they add to the thread.
   - questionToCarry: "A question to carry".
   Do not write an inYourWords field; the member's words belong inside the thread.
8. No praise inflation, hype, or self-help language.
9. When ingresses (planet sign changes) or transits are provided with dates, you may note that an entry or a shift in mood falls near one, as part of the reading, never as the point: pattern, not prophecy. Describe the overlap. No causal language.
10. "A question to carry" must name one concrete thing from this period, taken from the user message: a dated sky overlap (for example a transit or ingress with its date), a journal theme in the member's own words, an intention they set, or a task they finished or that is still open. Ideally it grows out of the thread. Phrase it as one open question. No prediction, no advice, and no causal wording. A question that could be asked of any month, such as "What from October would you like to carry forward?", is too generic; leave the section out rather than write one.
11. "Saved from Stelloquy" items are moments the member chose to keep from their Stelloquy conversations. Each is labelled with whose words it is. Only items labelled as the member's words may be quoted or paraphrased as theirs. For items labelled as Stelloquy's words, say the member saved or held on to that reflection; never present those words as the member's own.
12. Speak to the member as "you". Never use their name or refer to them in the third person.
13. "A question to carry" is a single question with one question mark.
14. A reading describes the pattern, never the member's readiness, capacity, honesty or self-awareness. Never suggest they were not ready, held back, or avoided something. Rest and unfinished things stand on their own.
15. Keep it short. For a month or sky cycle: thread at most 130 words, sky at most 70, plans and goals at most 30. A week is about half that; a quarter can be a third longer. Cut anything that restates the data.

If there are zero journal entries and no "Saved from Stelloquy" items in the user message, do not mention the absence of journal entries. Build the thread from check-ins, intentions and plans if they say something; otherwise leave the thread out. The app handles that case separately.

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

  return `Write a period look back for ${title} (${sources.period.periodStart} through ${sources.period.periodEnd}). Read all of it before you look for the thread.

Member name: ${sources.displayName}
${options.context ? `\n${options.context}\n` : ''}
Sky for the period (from ephemeris):
${sources.sky.text}

Ingresses (planet sign changes):
${ingressBlock}
${
  sources.majorTransits
    ? `
Major transits during this period:
  To the member's own chart: ${sources.majorTransits.personal.length ? sources.majorTransits.personal.join('; ') : '(none)'}
  Collective: ${sources.majorTransits.collective.length ? sources.majorTransits.collective.join('; ') : '(none)'}
${
      sources.majorTransits.lenses?.length
        ? `What each is often read as being about, for this member:\n${sources.majorTransits.lenses.map((l) => `  - ${l}`).join('\n')}\n`
        : ''
    }Transits to the member's own chart usually say the most. Use only the ones that speak to the thread.
`
    : ''
}
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
