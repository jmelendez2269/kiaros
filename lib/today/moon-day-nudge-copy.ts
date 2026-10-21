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
      "We like the new moon for small beginnings. A ritual entry is here if you want to note what you're starting.",
    bodyPhone: 'We like it for small beginnings.',
    cta: 'Start a ritual entry',
    dismiss: 'Not today',
  },
  full: {
    headline: 'Full moon today',
    body:
      "We like the full moon for looking back at what's grown. A ritual entry is here if you want to write it down.",
    bodyPhone: 'We like it for looking back.',
    cta: 'Start a ritual entry',
    dismiss: 'Not today',
  },
}
