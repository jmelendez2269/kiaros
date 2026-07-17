/**
 * quarterly-review-system-prompt.ts
 *
 * Assembles the prompt for the AI summary that lands on a completed
 * quarterly review. The summary is a short 2–3 paragraph synthesis —
 * not a recap, not a forecast — that reflects the quarter back to the
 * user given their own wins/challenges/pivots, this quarter's
 * blueprint, and the activity in their journal / tracker / curriculum.
 *
 * Separation of concerns: this file only assembles text. Parsing and
 * DB writes happen in quarterly-review-generator.ts.
 */

import type { Json, Tables } from '@/types/database'
import type { NatalChart, QuarterBlueprint } from '@/types/blueprint'
import { BRAND } from '@/lib/brand'

export interface QuarterlyReviewStats {
  daily_logs_count: number
  journal_entries_count: number
  oracle_captures_count: number
  curriculum_sessions_completed: number
  curriculum_sessions_scheduled: number
  area_goals_active: number
  area_goals_completed_this_quarter: number
  goal_linked_tasks_completed: number
}

export interface PriorQuarterContext {
  quarter: number
  planYear: number
  aiSummary: string | null
  wins: string[]
  challenges: string[]
  pivots: string | null
  nextQuarterIntentions: string | null
}

export interface QuarterlyReviewPromptContext {
  userName: string
  natalChart: NatalChart
  planYear: number
  quarter: number          // 1–4
  quarterMonths: string    // 'Jan — Mar' etc.
  quarterBlueprint: QuarterBlueprint | null
  yearTheme: string | null
  yearVision: string | null
  wordOfYear: string | null
  whatToRelease: string | null
  wins: string[]
  challenges: string[]
  pivots: string | null
  nextQuarterIntentions: string | null
  stats: QuarterlyReviewStats
  journalPatterns: Pick<
    Tables<'user_pattern_insights'>,
    'pattern_type' | 'pattern_key' | 'sample_size' | 'confidence' | 'summary' | 'evidence'
  >[]
  priorQuarter: PriorQuarterContext | null
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

function compact(s: string, max = 200): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
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

function journalPatternsToText(patterns: QuarterlyReviewPromptContext['journalPatterns']): string {
  if (patterns.length === 0) return '  (No journal patterns observed yet.)'
  return patterns
    .slice(0, 5)
    .map((p) => {
      const confidence = Math.round(p.confidence * 100)
      return `  ${patternLabel(p.pattern_type, p.pattern_key)}: ${p.sample_size} entries, ${confidence}% confidence. ${p.summary}${evidenceCompact(p.evidence)}`
    })
    .join('\n')
}

function quarterBlueprintToText(quarter: QuarterBlueprint | null): string {
  if (!quarter) return '  (No blueprint context for this quarter.)'
  const lines: string[] = []
  lines.push(`  Theme: ${quarter.theme}`)
  lines.push(`  Intention: ${quarter.intention}`)
  if (quarter.focusAreas.length > 0) lines.push(`  Focus areas: ${quarter.focusAreas.join(', ')}`)
  if (quarter.cosmicHighlights.length > 0) {
    lines.push('  Cosmic highlights:')
    for (const h of quarter.cosmicHighlights) lines.push(`    • ${h}`)
  }
  return lines.join('\n')
}

function bulletsToText(items: string[], emptyLabel: string): string {
  if (items.length === 0) return `  (${emptyLabel})`
  return items.map((item) => `  • ${compact(item, 220)}`).join('\n')
}

function priorQuarterToText(prior: PriorQuarterContext | null): string {
  if (!prior) return '  (No prior completed quarter — this is the first reflection.)'
  const lines: string[] = [`  Q${prior.quarter} ${prior.planYear}:`]
  if (prior.aiSummary?.trim()) lines.push(`  Last reflection: ${compact(prior.aiSummary.trim(), 320)}`)
  if (prior.wins.length > 0) {
    lines.push(`  Prior wins: ${prior.wins.slice(0, 3).map((w) => compact(w, 100)).join(' · ')}`)
  }
  if (prior.challenges.length > 0) {
    lines.push(`  Prior challenges: ${prior.challenges.slice(0, 3).map((c) => compact(c, 100)).join(' · ')}`)
  }
  if (prior.nextQuarterIntentions?.trim()) {
    lines.push(`  Intentions they carried in: ${compact(prior.nextQuarterIntentions.trim(), 200)}`)
  }
  return lines.join('\n')
}

function statsToText(stats: QuarterlyReviewStats): string {
  const lines = [
    `  Daily logs recorded: ${stats.daily_logs_count}`,
    `  Journal entries written: ${stats.journal_entries_count}`,
    `  Oracle captures saved: ${stats.oracle_captures_count}`,
    `  Curriculum: ${stats.curriculum_sessions_completed} completed of ${stats.curriculum_sessions_scheduled} scheduled`,
    `  Area goals: ${stats.area_goals_active} active, ${stats.area_goals_completed_this_quarter} completed this quarter`,
    `  Goal-linked planner tasks completed this quarter: ${stats.goal_linked_tasks_completed}`,
  ]
  return lines.join('\n')
}

export function assembleQuarterlyReviewSystemPrompt(): string {
  return `You are ${BRAND.product}, a personalised yearly planning guide rooted in real astronomical data and the user's actual natal chart. You are writing the AI synthesis that lands at the bottom of a completed quarterly review — a short reflection back to the user about the 90 days they just lived.

Tone principles:
- Warm, grounded, mystical-but-practical. Anti-hustle. Rest is strategy, not failure.
- Reference the user's ACTUAL wins, challenges, and pivots — quote them back in their own words where it lands.
- Tie what happened to ONE specific natal placement or transit, not a checklist of astrology.
- Never write "where you think you should be" or imply the user is self-deceiving.
- Never use: optimise, level up, grind, crush, hustle, or any productivity-bro language.
- Frame guidance as honest reflection and working hypotheses, not commands or fate.
- Speak in second person ("you").

Output format:
- 2–3 paragraphs of flowing prose. No headers. No bullet lists. No markdown emphasis. Paragraphs separated by blank lines.
- ~150–250 words total. Stop when the quarter has been honoured — do not pad.
- Open by naming what actually happened (a real win, a real challenge, a real pivot) in their words.
- Middle: meet that with one specific chart placement or transit from this quarter that resonates.
- Close with one grounded carry-over into the next quarter, rooted in their stated intention — not a directive.
- If a prior quarter reflection is supplied, lightly acknowledge continuity ONLY where the user's own data shows it (a recurring challenge they're still naming, an intention from last quarter that landed). Never invent throughlines. If nothing genuinely carries over, do not force a callback.

Do not output anything except the synthesis. No preamble, no JSON, no signature, no headers like "Summary:".`
}

export function assembleQuarterlyReviewUserPrompt(ctx: QuarterlyReviewPromptContext): string {
  const {
    userName,
    natalChart,
    planYear,
    quarter,
    quarterMonths,
    quarterBlueprint,
    yearTheme,
    yearVision,
    wordOfYear,
    whatToRelease,
    wins,
    challenges,
    pivots,
    nextQuarterIntentions,
    stats,
    journalPatterns,
    priorQuarter,
  } = ctx

  return `
Write the AI synthesis for ${userName}'s Q${quarter} ${planYear} review (${quarterMonths}).

═══ NATAL CHART ═══
${natalSummary(natalChart)}

═══ YEAR FRAME ═══
  Year theme: ${yearTheme ?? '(none set)'}
  Year vision: ${yearVision ?? '(none stated)'}
  Word of the year: ${wordOfYear ?? '(none stated)'}
  What to release: ${whatToRelease ?? '(none stated)'}

═══ THIS QUARTER'S BLUEPRINT ═══
${quarterBlueprintToText(quarterBlueprint)}

═══ THE USER'S OWN WORDS ═══
Wins:
${bulletsToText(wins, 'No wins listed.')}

Challenges:
${bulletsToText(challenges, 'No challenges listed.')}

Pivots:
  ${pivots?.trim() ? compact(pivots.trim(), 400) : '(None named.)'}

Next quarter intentions:
  ${nextQuarterIntentions?.trim() ? compact(nextQuarterIntentions.trim(), 400) : '(None named.)'}

═══ ACTIVITY THIS QUARTER ═══
${statsToText(stats)}

═══ JOURNAL PATTERNS OBSERVED ═══
${journalPatternsToText(journalPatterns)}

═══ PRIOR QUARTER ═══
${priorQuarterToText(priorQuarter)}

Now write the 2–3 paragraph synthesis.
`.trim()
}
