import type { NatalChart, QuarterBlueprint, WeekBlueprint, YearEphemeris } from '@/types/blueprint'
import type { Json, Tables } from '@/types/database'

export interface OraclePromptContext {
  profile: Tables<'user_profiles'> | null
  ephemeris: YearEphemeris | null
  blueprint: {
    year_theme: string | null
    quarters: Json | null
    months: Json | null
    weeks: Json | null
  } | null
  goalCategories: Pick<Tables<'goal_categories'>, 'name' | 'description' | 'success' | 'sort_order'>[]
  curriculumPlans: Pick<
    Tables<'curriculum_plans'>,
    | 'topic'
    | 'title'
    | 'status'
    | 'intensity'
    | 'duration_weeks'
    | 'weekly_hours'
    | 'objectives'
    | 'outcomes'
    | 'skills'
    | 'summary'
    | 'start_date'
    | 'approved_at'
    | 'created_at'
  >[]
  curriculumSessions: Pick<
    Tables<'curriculum_sessions'>,
    'curriculum_title' | 'week_number' | 'title' | 'session_type' | 'scheduled_for' | 'status'
  >[]
  dailyLogs: Pick<Tables<'daily_logs'>, 'log_date' | 'energy_level' | 'mood_tag' | 'notes'>[]
  journalEntries: Pick<Tables<'journal_entries'>, 'entry_date' | 'title' | 'body' | 'mood_tag' | 'is_ritual'>[]
  patternInsights: Pick<
    Tables<'user_pattern_insights'>,
    'pattern_type' | 'pattern_key' | 'sample_size' | 'confidence' | 'first_seen' | 'last_seen' | 'summary' | 'evidence'
  >[]
  quarterlyReviews: Pick<
    Tables<'quarterly_reviews'>,
    'quarter' | 'completed_at' | 'wins' | 'challenges' | 'pivots' | 'next_quarter_intentions' | 'ai_summary' | 'created_at'
  >[]
  today: string
}

function formatPlanetLine(
  name: string,
  pos: { sign: string; degree: number; house: number; retrograde?: boolean }
): string {
  return `${name}: ${Math.floor(pos.degree)} deg ${pos.sign}, House ${pos.house}${pos.retrograde ? ' (Rx)' : ''}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlanetPosition(value: unknown): value is {
  sign: string
  degree: number
  house: number
  retrograde?: boolean
} {
  return (
    isRecord(value) &&
    typeof value.sign === 'string' &&
    typeof value.degree === 'number' &&
    typeof value.house === 'number'
  )
}

function getSafeWeekBlueprints(value: Json | null): WeekBlueprint[] {
  if (!Array.isArray(value)) return []

  return value.reduce<WeekBlueprint[]>((acc, item) => {
    if (!isRecord(item)) return acc
    const isWeek =
      typeof item.weekNumber === 'number' &&
      typeof item.startDate === 'string' &&
      typeof item.endDate === 'string' &&
      typeof item.theme === 'string' &&
      typeof item.energyType === 'string' &&
      Array.isArray(item.intentions) &&
      Array.isArray(item.goalCategoryFocus)

    if (isWeek) {
      acc.push(item as unknown as WeekBlueprint)
    }

    return acc
  }, [])
}

function getSafeQuarterBlueprints(value: Json | null): QuarterBlueprint[] {
  if (!Array.isArray(value)) return []

  return value.reduce<QuarterBlueprint[]>((acc, item) => {
    if (!isRecord(item)) return acc
    const isQuarter =
      typeof item.quarter === 'number' &&
      typeof item.theme === 'string' &&
      typeof item.intention === 'string' &&
      Array.isArray(item.focusAreas) &&
      Array.isArray(item.cosmicHighlights) &&
      Array.isArray(item.pushPeriods) &&
      Array.isArray(item.restPeriods)

    if (isQuarter) {
      acc.push(item as unknown as QuarterBlueprint)
    }

    return acc
  }, [])
}

function buildLayer1(): string {
  return `You are the Oracle of Kiaros, a guide who speaks from the intersection of real astronomical data and the user's lived experience. You are warm, grounded, and gently clear. You never give generic astrology. You never use hustle language. You reference real placements and transits when they are relevant, but you offer them as invitations and observations rather than fixed truths. Avoid rigid language like "exact" or "concrete" when speaking about a person's path. Rest is strategy; reflection is data. Assume everyone is moving through different cycles at different speeds. Your grounding context includes the user's life areas and the body of records they have produced in Kiaros, so your guidance should feel longitudinal, personal, and aware of what they are already building. Keep responses under 200 words unless the user asks for more detail.`
}

function buildLayer2(profile: Tables<'user_profiles'>): string {
  const chart = profile.natal_chart as NatalChart | null
  if (
    !chart ||
    !isRecord(chart) ||
    !isPlanetPosition(chart.sun) ||
    !isPlanetPosition(chart.moon) ||
    !isPlanetPosition(chart.mercury) ||
    !isPlanetPosition(chart.venus) ||
    !isPlanetPosition(chart.mars) ||
    !isPlanetPosition(chart.jupiter) ||
    !isPlanetPosition(chart.saturn) ||
    !isPlanetPosition(chart.uranus) ||
    !isPlanetPosition(chart.neptune) ||
    !isPlanetPosition(chart.pluto) ||
    typeof chart.rising !== 'string'
  ) {
    return '## Natal Chart\nNatal chart data not yet available.'
  }

  const lines = [
    '## Natal Chart',
    chart.birthTimeUnknown ? '(Birth time unknown - house placements are approximate)' : null,
    formatPlanetLine('Sun', chart.sun),
    formatPlanetLine('Moon', chart.moon),
    `Rising: ${chart.rising}`,
    formatPlanetLine('Mercury', chart.mercury),
    formatPlanetLine('Venus', chart.venus),
    formatPlanetLine('Mars', chart.mars),
    formatPlanetLine('Jupiter', chart.jupiter),
    formatPlanetLine('Saturn', chart.saturn),
    formatPlanetLine('Uranus', chart.uranus),
    formatPlanetLine('Neptune', chart.neptune),
    formatPlanetLine('Pluto', chart.pluto),
  ].filter(Boolean) as string[]

  return lines.join('\n')
}

function buildLayer3(ephemeris: YearEphemeris, today: string): string {
  if (!ephemeris || !Array.isArray(ephemeris.days) || !Array.isArray(ephemeris.moonPhases)) {
    return `## Current Cosmic Context\nToday is ${today}. Ephemeris data unavailable for this date.`
  }

  const day = ephemeris.days.find((entry) => isRecord(entry) && entry.date === today)
  if (!day) {
    return `## Current Cosmic Context\nToday is ${today}. Ephemeris data unavailable for this date.`
  }

  if (
    !isRecord(day.sun) ||
    !isRecord(day.moon) ||
    typeof day.sun.degree !== 'number' ||
    typeof day.sun.sign !== 'string' ||
    typeof day.moon.degree !== 'number' ||
    typeof day.moon.sign !== 'string' ||
    typeof day.moon.lunarPhase !== 'string' ||
    typeof day.moon.illumination !== 'number'
  ) {
    return `## Current Cosmic Context\nToday is ${today}. Ephemeris data unavailable for this date.`
  }

  const moonPhase = day.moon.lunarPhase
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  const illumination = Math.round(day.moon.illumination * 100)

  const lines = [
    '## Current Cosmic Context',
    `Today is ${today}.`,
    `Sun: ${Math.floor(day.sun.degree)} deg ${day.sun.sign} | Moon: ${Math.floor(day.moon.degree)} deg ${day.moon.sign} (${moonPhase}, ${illumination}% illuminated)`,
  ]

  if (Array.isArray(day.transits) && day.transits.length > 0) {
    const transitSummary = day.transits
      .slice(0, 5)
      .filter(
        (transit) =>
          isRecord(transit) &&
          typeof transit.planet === 'string' &&
          typeof transit.aspect === 'string' &&
          typeof transit.natalPlanet === 'string' &&
          typeof transit.applying === 'boolean' &&
          typeof transit.orb === 'number'
      )
      .map(
        (transit) =>
          `${transit.planet} ${transit.aspect} natal ${transit.natalPlanet} (${transit.applying ? 'applying' : 'separating'}, ${transit.orb.toFixed(1)} deg orb)`
      )
      .join(', ')
    lines.push(`Active transits: ${transitSummary || 'none significant today'}`)
  } else {
    lines.push('Active transits: none significant today')
  }

  if (Array.isArray(day.retrogrades) && day.retrogrades.length > 0) {
    lines.push(`Retrograde planets: ${day.retrogrades.join(', ')}`)
  } else {
    lines.push('Retrograde planets: none')
  }

  const upcoming = ephemeris.moonPhases.find(
    (phase) =>
      isRecord(phase) &&
      typeof phase.date === 'string' &&
      typeof phase.phase === 'string' &&
      typeof phase.sign === 'string' &&
      phase.date > today
  )
  if (upcoming) {
    const phaseName = upcoming.phase
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    lines.push(`Next: ${phaseName} Moon in ${upcoming.sign} on ${upcoming.date}`)
  }

  return lines.join('\n')
}

function buildLayer4(
  profile: Tables<'user_profiles'>,
  blueprint: OraclePromptContext['blueprint'],
  today: string
): string {
  const lines = ['## Goals + Blueprint']

  if (profile.year_vision) lines.push(`Year vision: "${profile.year_vision}"`)
  if (profile.word_of_year) lines.push(`Word of year: "${profile.word_of_year}"`)
  if (profile.study_focus) lines.push(`Study focus: "${profile.study_focus}"`)

  if (!blueprint) {
    lines.push('Blueprint: not yet generated.')
    return lines.join('\n')
  }

  if (blueprint.year_theme) lines.push(`Year theme: "${blueprint.year_theme}"`)

  if (blueprint.weeks) {
    const weeks = getSafeWeekBlueprints(blueprint.weeks)
    const currentWeek = weeks.find((week) => week.startDate <= today && week.endDate >= today)
    if (currentWeek) {
      lines.push(`\nCurrent week (Week ${currentWeek.weekNumber}): "${currentWeek.theme}"`)
      lines.push(`Energy type: ${currentWeek.energyType}`)
      if (Array.isArray(currentWeek.intentions) && currentWeek.intentions.length > 0) {
        lines.push("This week's intentions:")
        currentWeek.intentions.forEach((intention) => lines.push(`- ${intention}`))
      }
      if (Array.isArray(currentWeek.goalCategoryFocus) && currentWeek.goalCategoryFocus.length > 0) {
        lines.push(`Focus areas: ${currentWeek.goalCategoryFocus.join(', ')}`)
      }
    }
  }

  if (blueprint.quarters) {
    const quarters = getSafeQuarterBlueprints(blueprint.quarters)
    const month = new Date(today).getMonth() + 1
    const currentQuarterNumber = Math.ceil(month / 3)
    const currentQuarter = quarters.find((quarter) => quarter.quarter === currentQuarterNumber)
    if (currentQuarter) {
      lines.push(`\nCurrent quarter (Q${currentQuarter.quarter}): "${currentQuarter.theme}"`)
      lines.push(`Intention: ${currentQuarter.intention}`)
    }
  }

  return lines.join('\n')
}

function compactJsonList(value: Json | null, maxItems = 3): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, maxItems)
}

function summarizeText(text: string | null | undefined, maxLength = 140): string | null {
  if (!text) return null

  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return null

  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`
}

function formatPatternLabel(patternType: string, patternKey: string): string {
  if (patternType === 'aspect') return patternKey.split(':').join(' ')
  if (patternType === 'lunar_phase') return `${patternKey} Moon`
  if (patternType === 'lunar_sign') return `Moon in ${patternKey}`
  if (patternType === 'retrograde') return `${patternKey} retrograde`
  return patternKey
}

function summarizeEvidence(value: Json): string | null {
  if (!Array.isArray(value)) return null

  const entries = value
    .map((item) => {
      if (!isRecord(item) || typeof item.entry_date !== 'string') return null
      const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Untitled'
      return `${item.entry_date}: ${summarizeText(title, 48) ?? 'Untitled'}`
    })
    .filter(Boolean)
    .slice(0, 3)

  return entries.length > 0 ? entries.join('; ') : null
}

function buildLayer5(ctx: OraclePromptContext): string {
  const lines = ['## Produced Context']

  if (ctx.goalCategories.length > 0) {
    lines.push('Life areas:')
    ctx.goalCategories.forEach((category) => {
      const parts = [category.name]
      const success = summarizeText(category.success, 100)
      const description = summarizeText(category.description, 100)
      if (success) parts.push(`success: ${success}`)
      if (description) parts.push(`notes: ${description}`)
      lines.push(`- ${parts.join(' | ')}`)
    })
  } else {
    lines.push('Life areas: not yet defined.')
  }

  if (ctx.curriculumPlans.length > 0) {
    lines.push('\nCurriculum plans:')
    ctx.curriculumPlans.forEach((plan) => {
      const parts = [
        `${plan.title} (${plan.topic})`,
        `status: ${plan.status}`,
        `${plan.intensity}, ${plan.duration_weeks} weeks, ${plan.weekly_hours} hrs/week`,
      ]
      const outcomes = compactJsonList(plan.outcomes)
      const skills = compactJsonList(plan.skills)
      const summary = summarizeText(plan.summary, 120)
      if (outcomes.length > 0) parts.push(`outcomes: ${outcomes.join(', ')}`)
      if (skills.length > 0) parts.push(`skills: ${skills.join(', ')}`)
      if (summary) parts.push(`summary: ${summary}`)
      lines.push(`- ${parts.join(' | ')}`)
    })
  } else {
    lines.push('\nCurriculum plans: none yet.')
  }

  if (ctx.curriculumSessions.length > 0) {
    lines.push('\nUpcoming study sessions:')
    ctx.curriculumSessions.forEach((session) => {
      lines.push(
        `- ${session.scheduled_for}: ${session.curriculum_title} / Week ${session.week_number} / ${session.title} (${session.session_type}, ${session.status})`
      )
    })
  }

  if (ctx.dailyLogs.length > 0) {
    lines.push('\nRecent tracker signals:')
    ctx.dailyLogs.forEach((log) => {
      const parts = [`${log.log_date}`]
      if (log.energy_level != null) parts.push(`energy ${log.energy_level}/5`)
      if (log.mood_tag) parts.push(`mood ${log.mood_tag}`)
      const note = summarizeText(log.notes, 90)
      if (note) parts.push(`note: ${note}`)
      lines.push(`- ${parts.join(' | ')}`)
    })
  }

  if (ctx.journalEntries.length > 0) {
    lines.push('\nRecent journal themes:')
    ctx.journalEntries.forEach((entry) => {
      const title = entry.title || 'Untitled entry'
      const summary = summarizeText(entry.body, 110)
      const parts = [`${entry.entry_date}: ${title}`]
      if (entry.mood_tag) parts.push(`mood ${entry.mood_tag}`)
      if (entry.is_ritual) parts.push('ritual')
      if (summary) parts.push(summary)
      lines.push(`- ${parts.join(' | ')}`)
    })
  }

  if (ctx.patternInsights.length > 0) {
    lines.push('\nRecognized journal patterns:')
    ctx.patternInsights.forEach((pattern) => {
      const label = formatPatternLabel(pattern.pattern_type, pattern.pattern_key)
      const parts = [
        `${label}`,
        `${pattern.sample_size} entries`,
        `confidence ${Math.round(pattern.confidence * 100)}%`,
      ]
      if (pattern.first_seen && pattern.last_seen) parts.push(`${pattern.first_seen} to ${pattern.last_seen}`)
      parts.push(pattern.summary)

      const evidence = summarizeEvidence(pattern.evidence)
      if (evidence) parts.push(`evidence: ${evidence}`)

      lines.push(`- ${parts.join(' | ')}`)
    })
  }

  if (ctx.quarterlyReviews.length > 0) {
    lines.push('\nQuarterly reviews:')
    ctx.quarterlyReviews.forEach((review) => {
      const wins = compactJsonList(review.wins)
      const challenges = compactJsonList(review.challenges)
      const parts = [`Q${review.quarter}`]
      if (review.completed_at) parts.push(`completed ${review.completed_at.slice(0, 10)}`)
      if (wins.length > 0) parts.push(`wins: ${wins.join(', ')}`)
      if (challenges.length > 0) parts.push(`challenges: ${challenges.join(', ')}`)
      const pivot = summarizeText(review.pivots, 90)
      const nextIntentions = summarizeText(review.next_quarter_intentions, 90)
      const summary = summarizeText(review.ai_summary, 110)
      if (pivot) parts.push(`pivot: ${pivot}`)
      if (nextIntentions) parts.push(`next: ${nextIntentions}`)
      if (summary) parts.push(`summary: ${summary}`)
      lines.push(`- ${parts.join(' | ')}`)
    })
  }

  lines.push(
    '\nUse this produced context as memory. When helpful, tie your guidance back to the user\'s declared life areas, active curriculum, recognized journal patterns, and reflected wins or challenges. Treat patterns as observed tendencies, not fate.'
  )

  return lines.join('\n')
}

export function buildOracleSystemPrompt(ctx: OraclePromptContext): string {
  if (!ctx.profile) {
    return `You are the Oracle of Kiaros, a warm, grounded guide. The user's profile data is not yet available. Encourage them to complete onboarding to unlock personalized guidance.`
  }

  const layers = [
    buildLayer1(),
    buildLayer2(ctx.profile),
    ctx.ephemeris
      ? buildLayer3(ctx.ephemeris, ctx.today)
      : '## Current Cosmic Context\nEphemeris data unavailable.',
    buildLayer4(ctx.profile, ctx.blueprint, ctx.today),
    buildLayer5(ctx),
  ]

  return layers.join('\n\n---\n\n')
}

// Returns a two-part system prompt. The `cached` segment holds layers that
// change rarely (persona, natal chart, year blueprint) and is marked for
// Anthropic prompt caching. The `dynamic` segment holds per-request context.
export function buildOracleSystemPromptSegments(ctx: OraclePromptContext): {
  cached: string | null
  dynamic: string
} {
  if (!ctx.profile) {
    return {
      cached: null,
      dynamic: `You are the Oracle of Kiaros, a warm, grounded guide. The user's profile data is not yet available. Encourage them to complete onboarding to unlock personalized guidance.`,
    }
  }

  const cached = [
    buildLayer1(),
    buildLayer2(ctx.profile),
    buildLayer4(ctx.profile, ctx.blueprint, ctx.today),
  ].join('\n\n---\n\n')

  const dynamic = [
    ctx.ephemeris
      ? buildLayer3(ctx.ephemeris, ctx.today)
      : '## Current Cosmic Context\nEphemeris data unavailable.',
    buildLayer5(ctx),
  ].join('\n\n---\n\n')

  return { cached, dynamic }
}
