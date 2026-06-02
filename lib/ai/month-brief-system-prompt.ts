/**
 * month-brief-system-prompt.ts
 *
 * Assembles the prompt for the per-month narrative brief shown in the
 * Month tab of /year. The brief is a 3–4 paragraph letter — not a list,
 * not a forecast — grounding the user in this month given their actual
 * chart, this month's MonthBlueprint, their year vision, journal
 * patterns, Oracle planner captures, and curriculum sessions.
 *
 * Separation of concerns: this file only assembles text. Parsing and DB
 * writes happen in month-brief-generator.ts.
 */

import type { Json, Tables } from '@/types/database'
import type { MonthBlueprint, NatalChart, QuarterBlueprint } from '@/types/blueprint'

interface CurriculumSessionForBrief {
  title: string
  description: string | null
  session_type: string | null
  scheduled_for: string
}

export interface PriorMonthBriefContext {
  month: number       // 1–12
  monthName: string
  planYear: number
  text: string
}

export interface PriorQuarterReviewContext {
  quarter: number
  planYear: number
  aiSummary: string | null
  wins: Json
  challenges: Json
  pivots: string | null
  nextQuarterIntentions: string | null
}

export interface MonthBriefPromptContext {
  userName: string
  natalChart: NatalChart
  planYear: number
  month: number             // 1–12
  monthName: string         // 'January' etc.
  monthBlueprint: MonthBlueprint
  quarterBlueprint: QuarterBlueprint | null
  yearTheme: string | null
  yearVision: string | null
  wordOfYear: string | null
  whatToRelease: string | null
  journalPatterns: Pick<
    Tables<'user_pattern_insights'>,
    'pattern_type' | 'pattern_key' | 'sample_size' | 'confidence' | 'summary' | 'evidence'
  >[]
  oraclePlannerCaptures: Pick<Tables<'oracle_captures'>, 'captured_text' | 'created_at'>[]
  curriculumSessions: CurriculumSessionForBrief[]
  priorMonthBrief: PriorMonthBriefContext | null
  priorQuarterReview: PriorQuarterReviewContext | null
}

function natalSummary(chart: NatalChart): string {
  const lines = [
    `Sun ${chart.sun.degree.toFixed(0)}° ${chart.sun.sign}, House ${chart.sun.house}`,
    `Moon ${chart.moon.degree.toFixed(0)}° ${chart.moon.sign}, House ${chart.moon.house}`,
    `Rising ${chart.rising}`,
    `Mercury ${chart.mercury.sign} H${chart.mercury.house}`,
    `Venus ${chart.venus.sign} H${chart.venus.house}`,
    `Mars ${chart.mars.sign} H${chart.mars.house}`,
  ]
  return lines.join(' · ')
}

function moonPhasesToText(month: MonthBlueprint): string {
  if (month.moonPhases.length === 0) return '  (No new/full moons fall inside this month.)'
  return month.moonPhases
    .map((mp) => `  ${mp.date} — ${mp.phase} moon: ${mp.significance}`)
    .join('\n')
}

function keyTransitsToText(month: MonthBlueprint): string {
  if (month.keyTransits.length === 0) return '  (No major transits flagged this month.)'
  return month.keyTransits.map((t) => `  • ${t}`).join('\n')
}

function intentionsToText(month: MonthBlueprint): string {
  if (month.intentions.length === 0) return '  (No intentions specified.)'
  return month.intentions.map((i) => `  • ${i}`).join('\n')
}

function patternLabel(patternType: string, patternKey: string): string {
  if (patternType === 'aspect') return patternKey.split(':').join(' ')
  if (patternType === 'lunar_phase') return `${patternKey} Moon`
  if (patternType === 'lunar_sign') return `Moon in ${patternKey}`
  if (patternType === 'retrograde') return `${patternKey} retrograde`
  return patternKey
}

function evidenceCompact(value: Json): string {
  if (!Array.isArray(value)) return ''
  const items = value
    .map((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null
      const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : null
      return title
    })
    .filter(Boolean)
    .slice(0, 2)
  return items.length > 0 ? ` (${items.join('; ')})` : ''
}

function journalPatternsToText(patterns: MonthBriefPromptContext['journalPatterns']): string {
  if (patterns.length === 0) return '  (No journal patterns observed yet.)'
  return patterns
    .slice(0, 6)
    .map((p) => {
      const confidence = Math.round(p.confidence * 100)
      return `  ${patternLabel(p.pattern_type, p.pattern_key)}: ${p.sample_size} entries, ${confidence}% confidence. ${p.summary}${evidenceCompact(p.evidence)}`
    })
    .join('\n')
}

function compact(s: string, max = 160): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function captureToText(captures: MonthBriefPromptContext['oraclePlannerCaptures']): string {
  if (captures.length === 0) return '  (No Oracle captures marked for planner context.)'
  return captures
    .slice(0, 5)
    .map((c) => `  ${c.created_at.slice(0, 10)}: ${compact(c.captured_text)}`)
    .join('\n')
}

function curriculumToText(sessions: CurriculumSessionForBrief[]): string {
  if (sessions.length === 0) return '  (No curriculum sessions scheduled this month.)'
  return sessions
    .slice(0, 8)
    .map((s) => {
      const head = `  ${s.scheduled_for} — ${s.title}${s.session_type ? ` [${s.session_type}]` : ''}`
      const desc = s.description?.trim()
      return desc ? `${head}\n      ${compact(desc, 140)}` : head
    })
    .join('\n')
}

function jsonListCompact(value: Json, max = 3): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (out.length >= max) break
    if (typeof item === 'string') {
      const t = item.trim()
      if (t) out.push(compact(t, 140))
    } else if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      const text =
        (typeof item.text === 'string' && item.text.trim()) ||
        (typeof item.title === 'string' && item.title.trim()) ||
        (typeof item.summary === 'string' && item.summary.trim()) ||
        null
      if (text) out.push(compact(text, 140))
    }
  }
  return out
}

function priorMonthBriefToText(prior: PriorMonthBriefContext | null): string {
  if (!prior) return '  (No prior month brief available.)'
  return `  Prior month: ${prior.monthName} ${prior.planYear}\n\n${prior.text
    .split(/\n+/)
    .map((line) => `  ${line.trim()}`)
    .filter((line) => line.trim().length > 0)
    .join('\n')}`
}

function priorQuarterReviewToText(review: PriorQuarterReviewContext | null): string {
  if (!review) return '  (No completed quarterly review yet.)'
  const lines: string[] = [`  Q${review.quarter} ${review.planYear} review:`]
  if (review.aiSummary?.trim()) lines.push(`  Summary: ${compact(review.aiSummary.trim(), 260)}`)
  const wins = jsonListCompact(review.wins)
  if (wins.length > 0) lines.push(`  Wins: ${wins.join(' · ')}`)
  const challenges = jsonListCompact(review.challenges)
  if (challenges.length > 0) lines.push(`  Challenges: ${challenges.join(' · ')}`)
  if (review.pivots?.trim()) lines.push(`  Pivots: ${compact(review.pivots.trim(), 200)}`)
  if (review.nextQuarterIntentions?.trim()) {
    lines.push(`  Next quarter intentions: ${compact(review.nextQuarterIntentions.trim(), 200)}`)
  }
  return lines.join('\n')
}

// ─── System prompt ──────────────────────────────────────────────────────

export function assembleMonthBriefSystemPrompt(): string {
  return `You are Kiaros, a personalised yearly planning guide rooted in real astronomical data and the user's actual natal chart. You are writing a short monthly brief — a letter to the user — for a single calendar month of their year.

Tone principles:
- Warm, grounded, mystical-but-practical. Anti-hustle. Rest is strategy.
- Reference the user's ACTUAL natal placements and ACTUAL transits this month, not generic sun-sign copy.
- Never write "where you think you should be" or imply the user is self-deceiving.
- Never use: optimise, level up, grind, crush, hustle, or any productivity-bro language.
- Frame guidance as invitations and working hypotheses, not commands or fate.
- Speak in second person ("you") as if writing directly to the user. First person from the user appears only in quoted intentions if at all.

Output format:
- 3–4 paragraphs of flowing prose. No headers. No bullet lists. No markdown emphasis. Just paragraphs separated by blank lines.
- ~180–280 words total. Stop when the month has been honoured — do not pad.
- Open with the month's actual sky (a moon phase, a transit, a retrograde) and ground it in one specific natal placement.
- Touch — softly, not as a checklist — on: how this month's energy meets the user's chart, where the user has said they want to go this year, any journal pattern that genuinely intersects with this month's sky, and where rest or push naturally lives in the month.
- Close with a single grounded invitation. Not a directive. Not a promise.

Do not output anything except the brief itself. No preamble, no JSON wrapper, no signature.`
}

// ─── User prompt ────────────────────────────────────────────────────────

export function assembleMonthBriefUserPrompt(ctx: MonthBriefPromptContext): string {
  const {
    userName,
    natalChart,
    planYear,
    monthName,
    monthBlueprint,
    quarterBlueprint,
    yearTheme,
    yearVision,
    wordOfYear,
    whatToRelease,
    journalPatterns,
    oraclePlannerCaptures,
    curriculumSessions,
    priorMonthBrief,
    priorQuarterReview,
  } = ctx

  return `
Write the monthly brief for ${userName} for ${monthName} ${planYear}.

═══════════════════════════════════════════
NATAL CHART (summary)
═══════════════════════════════════════════
  ${natalSummary(natalChart)}

═══════════════════════════════════════════
YEAR FRAMING
═══════════════════════════════════════════
Year theme: ${yearTheme ?? 'Not set'}
Year vision: ${yearVision ?? 'Not provided'}
Word of the year: ${wordOfYear ?? 'Not chosen'}
What ${userName} wants to release this year: ${whatToRelease ?? 'Not specified'}

═══════════════════════════════════════════
QUARTER CONTEXT
═══════════════════════════════════════════
${quarterBlueprint
  ? `Q${quarterBlueprint.quarter} theme: ${quarterBlueprint.theme}\nQ${quarterBlueprint.quarter} intention: ${quarterBlueprint.intention}`
  : '(No quarter blueprint available.)'}

═══════════════════════════════════════════
THIS MONTH (${monthName} ${planYear}) — from the blueprint
═══════════════════════════════════════════
Theme: ${monthBlueprint.theme}
Energy arc: ${monthBlueprint.energyArc}

Intentions:
${intentionsToText(monthBlueprint)}

Key transits this month:
${keyTransitsToText(monthBlueprint)}

Moon phases this month:
${moonPhasesToText(monthBlueprint)}

═══════════════════════════════════════════
OBSERVED JOURNAL PATTERNS (lived history hints, don't overfit)
═══════════════════════════════════════════
${journalPatternsToText(journalPatterns)}

═══════════════════════════════════════════
ORACLE CAPTURES MARKED FOR PLANNER CONTEXT
═══════════════════════════════════════════
${captureToText(oraclePlannerCaptures)}

═══════════════════════════════════════════
CURRICULUM SESSIONS SCHEDULED THIS MONTH
═══════════════════════════════════════════
${curriculumToText(curriculumSessions)}

═══════════════════════════════════════════
PRIOR MONTH BRIEF (for narrative continuity — echo a thread softly, don't repeat)
═══════════════════════════════════════════
${priorMonthBriefToText(priorMonthBrief)}

═══════════════════════════════════════════
LATEST QUARTERLY REVIEW (what the user actually noticed last quarter)
═══════════════════════════════════════════
${priorQuarterReviewToText(priorQuarterReview)}

═══════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════
Write the brief now. 3–4 paragraphs, plain prose, no headers, no lists, ~180–280 words. Reference at least one specific natal placement and one specific transit, moon phase, or retrograde from the data above. Honour the rules in the system prompt.
`.trim()
}
