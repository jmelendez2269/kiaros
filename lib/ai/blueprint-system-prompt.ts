/**
 * blueprint-system-prompt.ts
 *
 * Assembles the full prompt for blueprint generation from:
 *  - The user's natal chart (real ephemeris positions)
 *  - The year's key transits and moon phases
 *  - The user's goals, year vision, and what they want to release
 *
 * Separation of concerns: this file only assembles text.
 * Parsing and DB writes happen in blueprint-generator.ts.
 */

import type { NatalChart, YearEphemeris } from '@/types/blueprint'
import type { Json, Tables } from '@/types/database'
import { summariseTransitWindows } from '@/lib/ephemeris/transit-calculator'

interface GoalCategory {
  name: string
  description?: string | null
  success?: string | null
  icon_key?: string | null
  color_key?: string | null
  sort_order: number
}

interface BlueprintPromptContext {
  userName: string
  natalChart: NatalChart
  ephemeris: YearEphemeris
  goals: GoalCategory[]
  journalPatterns: Pick<
    Tables<'user_pattern_insights'>,
    'pattern_type' | 'pattern_key' | 'sample_size' | 'confidence' | 'first_seen' | 'last_seen' | 'summary' | 'evidence'
  >[]
  yearVision: string | null
  wordOfYear: string | null
  whatToRelease: string | null
  studyFocus: string | null
  planYear: number
  startDate: string   // YYYY-MM-DD (start of planning year)
}

// ─── Natal chart → readable summary ──────────────────────────────────────

function natalChartToText(chart: NatalChart): string {
  const planet = (name: string, pos: { sign: string; degree: number; house: number; retrograde?: boolean }) => {
    const deg = pos.degree.toFixed(1)
    const retro = pos.retrograde ? ' (retrograde at birth)' : ''
    return `  ${name}: ${deg}° ${pos.sign}, House ${pos.house}${retro}`
  }

  const timeNote = chart.birthTimeUnknown
    ? '\n(Birth time unknown — Rising/houses are approximate, calculated from noon.)'
    : ''

  return [
    `Rising (Ascendant): ${chart.rising}${timeNote}`,
    planet('Sun', chart.sun),
    planet('Moon', chart.moon),
    planet('Mercury', chart.mercury),
    planet('Venus', chart.venus),
    planet('Mars', chart.mars),
    planet('Jupiter', chart.jupiter),
    planet('Saturn', chart.saturn),
    planet('Uranus', chart.uranus),
    planet('Neptune', chart.neptune),
    planet('Pluto', chart.pluto),
  ].join('\n')
}

// ─── Moon phases → readable calendar ─────────────────────────────────────

function moonPhasesToText(ephemeris: YearEphemeris): string {
  const PHASE_LABEL: Record<string, string> = {
    'new': '🌑 New Moon',
    'first-quarter': '🌓 First Quarter',
    'full': '🌕 Full Moon',
    'last-quarter': '🌗 Last Quarter',
  }
  // Include only new and full moons in the prompt to keep it focused
  return ephemeris.moonPhases
    .filter(p => p.phase === 'new' || p.phase === 'full')
    .map(p => `  ${p.date}: ${PHASE_LABEL[p.phase] ?? p.phase} in ${p.sign}`)
    .join('\n')
}

// ─── Retrograde periods → readable text ──────────────────────────────────

function retrogradeToText(ephemeris: YearEphemeris): string {
  if (ephemeris.retrogradePeriods.length === 0) return '  None in this period.'
  return ephemeris.retrogradePeriods
    .map(r => `  ${r.planet} retrograde: ${r.startDate} – ${r.endDate} (${r.startSign}→${r.endSign})`)
    .join('\n')
}

// ─── Goals → readable summary ─────────────────────────────────────────────

function goalsToText(goals: GoalCategory[]): string {
  if (goals.length === 0) return '  No goal categories defined.'
  return goals
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(g => {
      const lines = [`  • ${g.name}`]
      if (g.description) lines.push(`    Description: ${g.description}`)
      if (g.success) lines.push(`    Success looks like: ${g.success}`)
      return lines.join('\n')
    })
    .join('\n')
}

// ─── Week list for the year ───────────────────────────────────────────────

function patternLabel(patternType: string, patternKey: string): string {
  if (patternType === 'aspect') return patternKey.split(':').join(' ')
  if (patternType === 'lunar_phase') return `${patternKey} Moon`
  if (patternType === 'lunar_sign') return `Moon in ${patternKey}`
  if (patternType === 'retrograde') return `${patternKey} retrograde`
  return patternKey
}

function evidenceToText(value: Json): string {
  if (!Array.isArray(value)) return ''

  const entries = value
    .map((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null
      const entryDate = typeof item.entry_date === 'string' ? item.entry_date : null
      const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Untitled'
      return entryDate ? `${entryDate}: ${title}` : null
    })
    .filter(Boolean)
    .slice(0, 3)

  return entries.length > 0 ? ` Evidence entries: ${entries.join('; ')}.` : ''
}

function journalPatternsToText(patterns: BlueprintPromptContext['journalPatterns']): string {
  if (patterns.length === 0) {
    return '  No journal pattern history yet. Generate the blueprint from natal chart, transits, goals, and year vision.'
  }

  return patterns
    .map((pattern) => {
      const confidence = Math.round(pattern.confidence * 100)
      const seenRange =
        pattern.first_seen && pattern.last_seen ? `${pattern.first_seen} to ${pattern.last_seen}` : 'date range unavailable'

      return `  ${patternLabel(pattern.pattern_type, pattern.pattern_key)}: ${pattern.sample_size} entries, ${confidence}% confidence, ${seenRange}. ${pattern.summary}${evidenceToText(pattern.evidence)}`
    })
    .join('\n')
}

function generateWeekList(startDate: string, year: number): Array<{ weekNumber: number; start: string; end: string }> {
  const weeks: Array<{ weekNumber: number; start: string; end: string }> = []
  const start = new Date(`${startDate}T00:00:00Z`)
  const yearEnd = new Date(`${year}-12-31T23:59:59Z`)

  let weekNum = 1
  const cur = new Date(start)
  while (cur <= yearEnd) {
    const weekStart = cur.toISOString().slice(0, 10)
    const weekEndDate = new Date(cur)
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
    const weekEnd = weekEndDate > yearEnd ? `${year}-12-31` : weekEndDate.toISOString().slice(0, 10)
    weeks.push({ weekNumber: weekNum++, start: weekStart, end: weekEnd })
    cur.setUTCDate(cur.getUTCDate() + 7)
  }

  return weeks
}

// ─── Main: assemble prompt ────────────────────────────────────────────────

export function assembleBlueprintSystemPrompt(): string {
  return `You are Kiaros, a personalised yearly planning guide rooted in real astronomical data and the user's actual natal chart. Your role is to synthesise astrology, personal goals, and the year's planetary weather into a grounded, warm, and actionable blueprint.

Tone principles:
- Warm, grounded, mystical-but-practical. Anti-hustle. Rest is strategy.
- Every statement about astrology must reference the user's ACTUAL natal placements or ACTUAL transits, not generic sun-sign copy.
- Never write "where you think you should be" or imply the user is self-deceiving.
- Never use: optimise, level up, grind, crush, hustle, or any productivity-bro language.
- Honour where the user is right now.
- Never frame guidance as fixed, absolute, or final. Kiaros offers invitations, possibilities, and working hypotheses.
- Avoid words like "exact" or "concrete" when describing intentions, growth, or identity unless required for technical schema rules.
- Assume everyone is moving through different cycles at different speeds, so leave room for timing, choice, and revision.`
}

export function assembleBlueprintUserPrompt(ctx: BlueprintPromptContext): string {
  const {
    userName,
    natalChart,
    ephemeris,
    goals,
    journalPatterns,
    yearVision,
    wordOfYear,
    whatToRelease,
    studyFocus,
    planYear,
    startDate,
  } = ctx

  const transitSummary = summariseTransitWindows(ephemeris)
  const weeks = generateWeekList(startDate, planYear)

  const weekListText = weeks
    .map(w => `  Week ${w.weekNumber}: ${w.start} to ${w.end}`)
    .join('\n')

  const prompt = `
Generate a personalised ${planYear} yearly blueprint for ${userName}.

This blueprint must cover the full calendar year ${planYear}, from ${planYear}-01-01 to ${planYear}-12-31.

═══════════════════════════════════════════
NATAL CHART (real astronomical positions at birth)
═══════════════════════════════════════════
${natalChartToText(natalChart)}

═══════════════════════════════════════════
YEAR VISION & INTENTIONS
═══════════════════════════════════════════
Year vision: ${yearVision ?? 'Not provided'}
Word of the year: ${wordOfYear ?? 'Not chosen'}
What ${userName} wants to release: ${whatToRelease ?? 'Not specified'}
Study / curriculum focus: ${studyFocus ?? 'Not specified'}

═══════════════════════════════════════════
GOAL CATEGORIES (in priority order)
═══════════════════════════════════════════
${goalsToText(goals)}

═══════════════════════════════════════════
KEY TRANSITS ${planYear} (real calculations)
═══════════════════════════════════════════
${transitSummary.length > 0 ? transitSummary.map(t => `  ${t}`).join('\n') : '  No major outer-planet transits in this period.'}

═══════════════════════════════════════════
NEW & FULL MOONS ${planYear}
═══════════════════════════════════════════
${moonPhasesToText(ephemeris)}

═══════════════════════════════════════════
RETROGRADE PERIODS ${planYear}
═══════════════════════════════════════════
${retrogradeToText(ephemeris)}

═══════════════════════════════════════════
OBSERVED JOURNAL PATTERNS
===========================================================
${journalPatternsToText(journalPatterns)}

===========================================================
WEEK GRID (for weekly blueprint)
═══════════════════════════════════════════
${weekListText}

═══════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════

Generate a complete blueprint as valid JSON matching the schema below. Do not include any text outside the JSON object.

OUTPUT BUDGET: You have ~16,000 tokens. Favor clarity, resonance, and flexibility over rigid certainty. Every string is short and dense — no filler, no preamble, no restating the prompt. Week-level fields especially must be terse (1 sentence each unless otherwise noted).

Rules:
1. yearTheme (≤12 words) and yearSummary (3–5 sentences) must reference ${userName}'s actual natal placements (e.g. "with your ${natalChart.moon.sign} Moon in House ${natalChart.moon.house}...") and actual transits listed above.
2. quarters: generate exactly 4 quarters for the year. Use quarter numbers 1, 2, 3, and 4. theme ≤10 words, intention 1 sentence, cosmicHighlights 2–4 items of ≤12 words each.
3. months: generate exactly 12 months covering January through December. Use month numbers 1 through 12. theme ≤10 words, 2–3 intentions, keyTransits ≤4 items, energyArc 1 sentence.
4. weeks: one per week in the week grid above. theme ≤8 words, 2–3 intentions (≤10 words each), cosmicContext ONE sentence referencing the actual transit/moon/retrograde that week. energyType reflects the actual planetary energy.
5. pushPeriods / restPeriods: reason ≤1 sentence each.
   Treat pushPeriods as active windows (an invitation toward forward motion), not commands. They mark moments when the sky may feel more supportive of effort or movement, while fully honoring the user's free will, energy, capacity, and changing circumstances. Treat restPeriods as passive windows (an invitation toward integration, repair, listening) — never framed as failure or absence.
6. Never invent transit dates not listed above. Never assign a transit to a week unless its date range overlaps.
7. goalCategoryFocus in each week must use the exact goal category names listed above.
8. Write intentions in first person (e.g. "I tend to..." not "You will...").
9. Intention language must stay suggestive, spacious, and non-prescriptive. Prefer phrases like "I explore," "I notice," "I make room for," "I experiment with," or "I gently return to."
10. Do not make identity claims or promises of outcomes. Speak as if each theme is a timely suggestion, not a command.
11. Never imply the user must act during a pushPeriods window. Frame those periods as invitations, openings, or supportive currents they may choose to engage with.
12. Do not omit early-year months or weeks even if the user signs up later in the year. The output is always a full-year blueprint.
13. Use observed journal patterns as personalization evidence when they are relevant to matching transits, moons, retrogrades, or rest/push choices. Do not overfit them or present them as fate; use them as lived-history hints.

JSON schema:
{
  "yearTheme": "string",
  "yearSummary": "string (3–5 sentences)",
  "quarters": [
    {
      "quarter": number,
      "theme": "string",
      "intention": "string",
      "focusAreas": ["goal category names"],
      "cosmicHighlights": ["2–4 key astrological events with dates"],
      "pushPeriods": [{"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string"}],
      "restPeriods": [{"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string"}]
    }
  ],
  "months": [
    {
      "month": number,
      "name": "string",
      "theme": "string",
      "intentions": ["string"],
      "keyTransits": ["human-readable transit description"],
      "moonPhases": [{"phase": "new|first-quarter|full|last-quarter", "date": "YYYY-MM-DD", "significance": "string"}],
      "energyArc": "string"
    }
  ],
  "weeks": [
    {
      "weekNumber": number,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "theme": "string",
      "intentions": ["2–3 suggestive intentions"],
      "energyType": "push|rest|reflect|initiate",
      "cosmicContext": "string",
      "goalCategoryFocus": ["goal category names"]
    }
  ],
  "pushPeriods": [{"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string"}],
  "restPeriods": [{"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string"}]
}
`.trim()

  return prompt
}
