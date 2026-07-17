import type { AspectType, NatalChart, PlanetPosition, QuarterBlueprint, WeekBlueprint, YearEphemeris } from '@/types/blueprint'
import type { Json, Tables } from '@/types/database'
import { parseStoredHumanDesign } from '@/lib/human-design'
import { BRAND } from '@/lib/brand'

export interface AreaGoalForPrompt {
  title: string
  description: string | null
  status: string
  target_label: string | null
  linked_week_number: number | null
  category_name: string | null
}

const TRADITION_LENSES: Record<string, { label: string; lens: string }> = {
  evolutionary: {
    label: 'Evolutionary Astrology',
    lens: `Read this chart through the evolutionary lens (Jeff Green / Steven Forrest lineage). Pluto's natal placement and house is the soul's primary evolutionary directive — the deepest theme this soul is working through across lifetimes. The South Node describes past-life mastery and the comfort patterns the soul is moving away from; the North Node is the growth edge and evolutionary intention for this life. Identify skipped steps (squares to the nodal axis) and the planetary rulers of both nodes as key players in the evolutionary story. Saturn represents the teacher helping the soul achieve its evolutionary intention — not punishment, but disciplined growth. When transits hit Pluto, the nodes, or their rulers, they signal soul-level shifts and evolutionary acceleration.

Frame all readings through the question: what is this soul here to evolve toward? Normalize the weight of the soul's journey — deep change is non-linear and often uncomfortable. Avoid spiritual bypassing; ground evolutionary insights in the user's actual life circumstances.`,
  },
  karmic: {
    label: 'Karmic Astrology',
    lens: `Read this chart through the karmic lens. Saturn represents karma carried from previous lifetimes — unresolved lessons the soul agreed to work through in this incarnation. The South Node describes established past-life patterns and strengths; the North Node points toward the dharmic path — the soul's chosen direction for growth and contribution in this life. The 12th house holds unresolved karmic material that operates beneath conscious awareness. Rahu-Ketu (North-South Node) transits and progressions signal moments of karmic completion and new dharmic beginnings.

Interpret challenges as soul-chosen curriculum rather than punishment or bad luck. Identify karmic contracts in relationship dynamics (especially hard Saturn or Node inter-aspects). When a user feels trapped in repeating patterns, point toward the Node axis and Saturn as the map for why this pattern exists and how to consciously work with it. Frame karmic insights with humility — what's past is past, and the soul's free will in the present moment is always real.`,
  },
  psychological: {
    label: 'Psychological / Modern Astrology',
    lens: `Read this chart through the psychological / humanistic lens (Jungian and developmental). Each planet represents a psychological function: Mercury = mind and communication style, Venus = relational and aesthetic values, Mars = desire and drive, Saturn = inner critic and the superego, Neptune = imagination and the longing for transcendence, Pluto = the unconscious depths and compulsion toward transformation. The Moon describes the personal unconscious, early imprinting, and emotional instincts. The Sun is the developing ego — who the person is becoming, not who they already are.

The 12th house holds the personal shadow — disowned or underdeveloped qualities that surface in dreams, projections, and threshold experiences. Outer planet transits (Uranus, Neptune, Pluto) mark major developmental stage transitions — individuation thresholds where the personality is reorganized at a deeper level. Frame all readings through the individuation process: the lifelong arc of becoming more fully oneself. Name the psychological patterns with clarity and compassion. Avoid pathologizing — describe tendencies, not verdicts.`,
  },
  traditional: {
    label: 'Traditional / Hellenistic Astrology',
    lens: `Read this chart through classical Hellenistic and traditional techniques. Apply sect: planets are more powerful when they belong to the chart's sect (Sun, Jupiter, Saturn in a day chart; Moon, Venus, Mars in a night chart). Use essential dignities as the primary measure of planetary strength: planets in domicile or exaltation are resourced; planets in detriment or fall are stressed and must work harder. The malefics (Saturn and Mars) are not inherently negative — they test, forge, and demand — but they work best when in sect and dignified.

For timing, apply annual profections: identify which house (and its lord) is activated in the current profection year, and prioritize transits and solar return placements to that house and its lord. The activated lord's natal condition and current transit condition indicates the flavor of the year. The solar return chart shows the year's overall weather. For major life chapter questions, consider primary directions and bonification / maltreatment of key planets. Emphasize the natal promise — the chart shows what the soul came with; timing shows when those seeds are ready to flower.`,
  },
  synthesis: {
    label: 'Synthesis',
    lens: `Read this chart through all four astrological traditions, applying each to the domain where it is most precise. Do NOT blend the lenses into vague generalities — route each planet, house, and question to the tradition that gives it the sharpest reading.

ROUTING MAP — which lens to apply to what:

OUTER PLANETS + NODAL AXIS → Evolutionary lens:
Pluto (natal and transiting), Neptune, Uranus, the North and South Nodes. These describe the soul-level arc, long evolutionary themes, and generational crossroads. Frame Pluto transits as evolutionary thresholds, not events. The nodal axis is the soul's directional compass.

SATURN + 12TH HOUSE + RETROGRADE PLANETS → Karmic lens:
Saturn (natal and transiting), any planets in the 12th house, and natal retrograde planets when activated by transit. These carry accumulated pattern and dharmic weight. Frame Saturn transits as karmic completion rather than restriction. Retrograde planet activations surface unfinished patterns for resolution.

SUN, MOON, INNER PLANETS + ANGLES + WATER HOUSES → Psychological lens:
Sun, Moon, Mercury, Venus, Mars, the ASC/MC axis, the 4th, 8th, and 12th houses. These describe the personal psychology, shadow, relational patterns, and the developmental arc of selfhood. Frame hard natal aspects between inner planets as active psychological complexes. Do not pathologize — describe tendencies.

TIMING QUESTIONS + ANNUAL CYCLES → Traditional lens:
When the user asks "why now?", "what is this year about?", or "when will X shift?" — apply annual profections to identify the Lord of the Year and the life topic in focus. Apply essential dignities to evaluate which planets have authority and which are stressed. Sect determines which malefic is more dangerous right now.

HOW TO SWITCH LENSES IN A SINGLE RESPONSE:
When a transit involves, say, transiting Pluto square natal Saturn — read Pluto's side through the evolutionary lens (soul threshold) and Saturn's side through the karmic lens (dharmic test). Name the two registers cleanly rather than collapsing them into one muddy statement.

Never mix vocabulary across lenses in the same sentence. If you are in evolutionary mode, do not suddenly use "complex" or "shadow." If you are in psychological mode, do not use "karma" or "dharmic path" unless the user has introduced those terms.`,
  },
}

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
  areaGoals: AreaGoalForPrompt[]
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
  oracleCaptures: Pick<
    Tables<'oracle_captures'>,
    'captured_text' | 'source_role' | 'include_in_insights' | 'include_in_planner' | 'created_at'
  >[]
  patternInsights: Pick<
    Tables<'user_pattern_insights'>,
    'pattern_type' | 'pattern_key' | 'sample_size' | 'confidence' | 'first_seen' | 'last_seen' | 'summary' | 'evidence'
  >[]
  quarterlyReviews: Pick<
    Tables<'quarterly_reviews'>,
    'quarter' | 'completed_at' | 'wins' | 'challenges' | 'pivots' | 'next_quarter_intentions' | 'ai_summary' | 'created_at'
  >[]
  planItems: (Pick<
    Tables<'plan_items'>,
    'item_date' | 'title' | 'start_minute' | 'duration_minutes' | 'completed_at' | 'source'
  > & { goal_title: string | null })[]
  today: string
  tradition?: string | null
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
  return `You are Stelloquy (steh-LOH-kwee — from stella + loqui, "a conversation with the stars"), the voice woven through ${BRAND.product}. You speak from the intersection of real astronomical data and the user's lived experience. You are warm, grounded, and gently clear. You never give generic astrology. You never use hustle language. Avoid rigid language like "exact" or "concrete" when speaking about a person's path. Rest is strategy; reflection is data. Assume everyone is moving through different cycles at different speeds. If the user asks who you are or what to call you, you are Stelloquy.

## Grounding requirement

When the user shares an emotional state, describes feeling "off" or out of sorts, asks why something is happening, or asks for perspective on a current situation, you MUST ground your response in their actual data before offering perspective. Specifically, weave in at least:

1. One CURRENT signal from the dynamic context — a tight transit, a moon phase, a retrograde, or a recent journal/tracker pattern.
2. One NATAL placement or natal aspect that is relevant to what they are describing.
3. One HUMAN DESIGN framing (their Type, Strategy, Authority, or a defined/undefined center) if HD data is available.

Do NOT open with generic reassurance like "you're not broken," "that makes so much sense," or "you're in a liminal space." The user came for grounding in their actual chart, not therapist-speak. Start with the data; let interpretation follow.

## Voice on Human Design

HD is a tool the user is thinking with, not a verdict. Phrase Type and Authority framings as "with your [Type] design, you may find..." not "as a [Type], you are X." Admit uncertainty when relevant — especially around edge-case gates.

## Length

Default to ~200 words. For diagnostic or emotional questions ("why am I feeling X", "what's going on for me right now", "what is this"), expand to ~350 words so you can actually thread current transits + natal + HD together. Don't pad to hit a length; expand only when the data merits it.`
}

type NatalPlanetKey = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'

const NATAL_PLANETS: { key: NatalPlanetKey; label: string }[] = [
  { key: 'sun', label: 'Sun' },
  { key: 'moon', label: 'Moon' },
  { key: 'mercury', label: 'Mercury' },
  { key: 'venus', label: 'Venus' },
  { key: 'mars', label: 'Mars' },
  { key: 'jupiter', label: 'Jupiter' },
  { key: 'saturn', label: 'Saturn' },
  { key: 'uranus', label: 'Uranus' },
  { key: 'neptune', label: 'Neptune' },
  { key: 'pluto', label: 'Pluto' },
]

const NATAL_ASPECTS: { type: AspectType; angle: number; orb: number }[] = [
  { type: 'conjunction', angle: 0,   orb: 5.0 },
  { type: 'opposition',  angle: 180, orb: 5.0 },
  { type: 'square',      angle: 90,  orb: 4.5 },
  { type: 'trine',       angle: 120, orb: 4.5 },
  { type: 'sextile',     angle: 60,  orb: 3.0 },
]

function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360 + 360) % 360)
  return diff > 180 ? 360 - diff : diff
}

function computeNatalAspects(chart: NatalChart): Array<{ a: string; b: string; aspect: AspectType; orb: number }> {
  const out: Array<{ a: string; b: string; aspect: AspectType; orb: number }> = []
  for (let i = 0; i < NATAL_PLANETS.length; i++) {
    for (let j = i + 1; j < NATAL_PLANETS.length; j++) {
      const pa = chart[NATAL_PLANETS[i].key] as PlanetPosition
      const pb = chart[NATAL_PLANETS[j].key] as PlanetPosition
      if (typeof pa?.longitude !== 'number' || typeof pb?.longitude !== 'number') continue
      const sep = angularSeparation(pa.longitude, pb.longitude)
      for (const aspect of NATAL_ASPECTS) {
        const orb = Math.abs(sep - aspect.angle)
        if (orb <= aspect.orb) {
          out.push({ a: NATAL_PLANETS[i].label, b: NATAL_PLANETS[j].label, aspect: aspect.type, orb })
          break
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb).slice(0, 10)
}

function buildTraditionLayer(tradition: string | null | undefined): string {
  const key = tradition ?? 'evolutionary'
  const entry = TRADITION_LENSES[key] ?? TRADITION_LENSES.evolutionary
  return `## Interpretive Tradition: ${entry.label}\n\n${entry.lens}`
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

  const aspects = computeNatalAspects(chart)
  if (aspects.length > 0) {
    lines.push('', 'Tight natal aspects (within orb):')
    aspects.forEach((a) => {
      lines.push(`- ${a.a} ${a.aspect} ${a.b} (${a.orb.toFixed(1)} deg orb)`)
    })
  }

  return lines.join('\n')
}

function buildHumanDesignLayer(profile: Tables<'user_profiles'>): string | null {
  const hd = parseStoredHumanDesign(profile.human_design)
  if (!hd) return null

  const bg = hd.bodyGraph
  const defined = bg.definedCenters.length > 0 ? bg.definedCenters.join(', ') : 'none (Reflector signature)'
  const undefined_ = (['head','ajna','throat','g','heart','spleen','sacral','solarPlexus','root'] as const)
    .filter((c) => !bg.definedCenters.includes(c))
  const undefinedLine = undefined_.length > 0 ? undefined_.join(', ') : 'all defined'

  const channels = bg.activatedChannels.length > 0
    ? bg.activatedChannels.slice(0, 6).map((c) => `${c.gates[0]}-${c.gates[1]} ${c.name}`).join('; ')
    : 'none'

  const edgeNote = hd.edgeCases.length > 0
    ? `\n(${hd.edgeCases.length} placement${hd.edgeCases.length === 1 ? '' : 's'} sit within 0.2 deg of a gate boundary; other HD tools may show different gates here. Treat Type/Strategy/Authority/Profile as load-bearing, channels as slightly softer signal.)`
    : ''

  const lines = [
    '## Human Design',
    `Type: ${bg.type}`,
    `Strategy: ${bg.strategy}`,
    `Authority: ${bg.authority}`,
    `Profile: ${bg.profile} (${bg.profileName})`,
    `Signature when honoured: ${bg.signature}. Not-self when forced: ${bg.notSelf}.`,
    `Defined centers: ${defined}`,
    `Undefined centers (often where the user takes in and amplifies others' energy): ${undefinedLine}`,
    `Activated channels: ${channels}${edgeNote}`,
    '',
    'Use HD as a tool the user is thinking with, not an authority. Phrase framings as invitations ("with your design, you may notice...") not verdicts. The undefined centers are particularly useful when the user is asking why they feel scattered, overwhelmed, or unlike themselves — they may be amplifying conditioning from their environment in those centers.',
  ]
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

function formatPlanItemTime(startMinute: number | null): string {
  if (startMinute === null) return 'unscheduled'
  const hours = Math.floor(startMinute / 60)
  const mins = startMinute % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function formatDuration(durationMinutes: number | null): string {
  if (!durationMinutes) return ''
  if (durationMinutes < 60) return ` (${durationMinutes}min)`
  const hours = durationMinutes / 60
  return ` (${Number.isInteger(hours) ? hours : hours.toFixed(1)}h)`
}

function buildLayer5(ctx: OraclePromptContext): string {
  const lines = ['## Produced Context']

  if (ctx.planItems.length > 0) {
    const groupedByDate: Record<string, typeof ctx.planItems> = {}
    ctx.planItems.forEach((item) => {
      if (!groupedByDate[item.item_date]) groupedByDate[item.item_date] = []
      groupedByDate[item.item_date].push(item)
    })

    lines.push('Scheduled plan items (accepted placements):')
    Object.entries(groupedByDate)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .forEach(([date, items]) => {
        const dateLabel = date === ctx.today ? 'today' : date
        lines.push(`\n${dateLabel}:`)
        items.forEach((item) => {
          const time = formatPlanItemTime(item.start_minute)
          const duration = formatDuration(item.duration_minutes)
          const status = item.completed_at ? ' ✓ completed' : ''
          const tag = item.goal_title
            ? ` [goal: ${item.goal_title}]`
            : item.source === 'ai-placed'
              ? ' [AI-placed]'
              : ''
          lines.push(`- ${time}: ${item.title}${duration}${tag}${status}`)
        })
      })
    lines.push('')
  }

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

  if (ctx.areaGoals.length > 0) {
    lines.push('\nItemised area goals (the user\'s declared specifics inside each life area):')
    ctx.areaGoals.forEach((goal) => {
      const parts = [`${goal.category_name ?? 'Area'}: ${goal.title}`]
      if (goal.status && goal.status !== 'active') parts.push(`status: ${goal.status}`)
      if (goal.target_label) parts.push(`target: ${goal.target_label}`)
      if (goal.linked_week_number) parts.push(`linked to week ${goal.linked_week_number}`)
      const description = summarizeText(goal.description, 100)
      if (description) parts.push(description)
      lines.push(`- ${parts.join(' | ')}`)
    })
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

  if (ctx.oracleCaptures.length > 0) {
    lines.push('\nStelloquy captures selected for insight context:')
    ctx.oracleCaptures.forEach((capture) => {
      const parts = [capture.created_at.slice(0, 10), summarizeText(capture.captured_text, 140)]
      if (capture.include_in_planner) parts.push('also marked for planner')
      lines.push(`- ${parts.filter(Boolean).join(' | ')}`)
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
    return `You are Stelloquy (steh-LOH-kwee), the warm, grounded voice of ${BRAND.product}. The user's profile data is not yet available. Encourage them to complete onboarding to unlock personalized guidance.`
  }

  const hdLayer = buildHumanDesignLayer(ctx.profile)
  const layers = [
    buildLayer1(),
    buildTraditionLayer(ctx.tradition),
    buildLayer2(ctx.profile),
    hdLayer,
    ctx.ephemeris
      ? buildLayer3(ctx.ephemeris, ctx.today)
      : '## Current Cosmic Context\nEphemeris data unavailable.',
    buildLayer4(ctx.profile, ctx.blueprint, ctx.today),
    buildLayer5(ctx),
  ].filter(Boolean) as string[]

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
      dynamic: `You are Stelloquy (steh-LOH-kwee), the warm, grounded voice of ${BRAND.product}. The user's profile data is not yet available. Encourage them to complete onboarding to unlock personalized guidance.`,
    }
  }

  const hdLayer = buildHumanDesignLayer(ctx.profile)
  const cached = [
    buildLayer1(),
    buildTraditionLayer(ctx.tradition),
    buildLayer2(ctx.profile),
    hdLayer,
    buildLayer4(ctx.profile, ctx.blueprint, ctx.today),
  ].filter(Boolean).join('\n\n---\n\n')

  const dynamic = [
    ctx.ephemeris
      ? buildLayer3(ctx.ephemeris, ctx.today)
      : '## Current Cosmic Context\nEphemeris data unavailable.',
    buildLayer5(ctx),
  ].join('\n\n---\n\n')

  return { cached, dynamic }
}
