/** Stella copy (Oct 21 2026) — use verbatim. */

export type MoonDayNudgePhase = 'new' | 'full'

export const MOON_DAY_NUDGE_COPY: Record<
  MoonDayNudgePhase,
  {
    headline: string
    body: string
    /** Narrow screens (below sm) — Stella phone-only lines. */
    bodyPhone: string
    cta: string
    dismiss: string
  }
> = {
  new: {
    headline: 'New moon today',
    body:
      "A new moon can be a quiet place to start. A ritual entry is here if you want to note what you're beginning.",
    bodyPhone: 'Starting something new?',
    cta: 'Start a ritual entry',
    dismiss: 'Not today',
  },
  full: {
    headline: 'Full moon today',
    body:
      'A full moon can be a good night to look back on the month. A ritual entry is here if you want to write it down.',
    bodyPhone: 'Looking back on the month?',
    cta: 'Start a ritual entry',
    dismiss: 'Not today',
  },
}
