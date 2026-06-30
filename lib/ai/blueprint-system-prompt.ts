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
import type { HumanDesignChart } from '@/lib/human-design'

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
  humanDesign: HumanDesignChart | null
  ephemeris: YearEphemeris
  goals: GoalCategory[]
  journalPatterns: Pick<
    Tables<'user_pattern_insights'>,
    'pattern_type' | 'pattern_key' | 'sample_size' | 'confidence' | 'first_seen' | 'last_seen' | 'summary' | 'evidence'
  >[]
  oraclePlannerCaptures: Pick<Tables<'oracle_captures'>, 'captured_text' | 'created_at' | 'include_in_insights'>[]
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

// ─── Human Design + Gene Keys → readable summary ────────────────────────

/**
 * Type-conditional weekly pacing framing. The handoff (A4) specifies these
 * shape-of-the-week defaults; Claude is told to honour the user's Type when
 * choosing `energyType` and writing weekly intentions. Phrased as
 * suggestions, not assertions — HD is one input among many, not a verdict.
 */
function typeWeeklyFraming(type: HumanDesignChart['bodyGraph']['type']): string {
  switch (type) {
    case 'Manifestor':
      return 'When choosing energyType and writing weekly intentions, hold the "inform before action" rhythm — Manifestors often move in initiating bursts followed by genuine rest. Push weeks land when the user has communicated their intent; rest weeks should not feel like apology.'
    case 'Generator':
      return 'When choosing energyType, favour a respond-then-engage rhythm — Generators come alive when something to respond to is in front of them. Intentions can invite noticing what lights up the gut, rather than forcing initiation.'
    case 'Manifesting Generator':
      return 'When choosing energyType, weave respond + inform — Manifesting Generators often move on multiple tracks at once and need permission to skip steps when something is no longer alive. Intentions can invite informing others before pivoting.'
    case 'Projector':
      return 'When choosing energyType, weight rest and reflect weeks more generously and keep push windows shorter — Projectors thrive on recognition and invitation, not sustained output. Intentions can invite waiting for the right opening rather than chasing.'
    case 'Reflector':
      return 'Pace at the lunar cycle (~28 days) rather than the calendar week — Reflectors take a full lunation to feel into a decision. Avoid daily-metric framing; favour "what does this whole moon cycle want to show me?" intentions and treat new and full moons as the real punctuation marks.'
  }
}

function humanDesignToText(chart: HumanDesignChart): string {
  const { bodyGraph, activationSequence, edgeCases } = chart

  const definedCenters = bodyGraph.definedCenters.length > 0
    ? bodyGraph.definedCenters.join(', ')
    : 'none (Reflector signature)'
  const channels = bodyGraph.activatedChannels.length > 0
    ? bodyGraph.activatedChannels.map((c) => `${c.gates[0]}–${c.gates[1]} ${c.name}`).join('; ')
    : 'none'

  // Distribute the 4 Prime Gifts across the year (one per quarter). Q1 →
  // Life's Work, Q2 → Evolution, Q3 → Radiance, Q4 → Purpose. Per the
  // handoff: contemplation threads, not goals.
  const gifts = [
    `Q1 contemplation — Life's Work: ${activationSequence.lifesWork.geneKey}.${activationSequence.lifesWork.line} (Shadow: ${activationSequence.lifesWork.shadow} → Gift: ${activationSequence.lifesWork.gift} → Siddhi: ${activationSequence.lifesWork.siddhi})`,
    `Q2 contemplation — Evolution: ${activationSequence.evolution.geneKey}.${activationSequence.evolution.line} (Shadow: ${activationSequence.evolution.shadow} → Gift: ${activationSequence.evolution.gift} → Siddhi: ${activationSequence.evolution.siddhi})`,
    `Q3 contemplation — Radiance: ${activationSequence.radiance.geneKey}.${activationSequence.radiance.line} (Shadow: ${activationSequence.radiance.shadow} → Gift: ${activationSequence.radiance.gift} → Siddhi: ${activationSequence.radiance.siddhi})`,
    `Q4 contemplation — Purpose: ${activationSequence.purpose.geneKey}.${activationSequence.purpose.line} (Shadow: ${activationSequence.purpose.shadow} → Gift: ${activationSequence.purpose.gift} → Siddhi: ${activationSequence.purpose.siddhi})`,
  ].join('\n  ')

  const edgeNote = edgeCases.length > 0
    ? `\n(Note: ${edgeCases.length} placement${edgeCases.length === 1 ? '' : 's'} sit within 0.2° of a gate boundary and may disagree with other HD tools — treat the Type / Strategy / Authority / Profile as load-bearing, the channels and Prime Gifts as still useful but slightly softer signal.)`
    : ''

  return `Type: ${bodyGraph.type}
Strategy: ${bodyGraph.strategy}
Authority: ${bodyGraph.authority}
Profile: ${bodyGraph.profile} (${bodyGraph.profileName})
Signature when honoured: ${bodyGraph.signature}    Not-self when forced: ${bodyGraph.notSelf}
Defined centers: ${definedCenters}
Activated channels: ${channels}

Gene Keys — Activation Sequence (one per quarter as contemplation threads):
  ${gifts}${edgeNote}`
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

function compactText(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`
}

function oraclePlannerCapturesToText(captures: BlueprintPromptContext['oraclePlannerCaptures']): string {
  if (captures.length === 0) {
    return '  No Oracle captures have been marked for planner context yet.'
  }

  return captures
    .map((capture) => {
      const date = capture.created_at.slice(0, 10)
      const alsoInsights = capture.include_in_insights ? ' Also marked for insight memory.' : ''
      return `  ${date}: ${compactText(capture.captured_text)}${alsoInsights}`
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

// ─── Tradition lenses for blueprint generation ────────────────────────────

const BLUEPRINT_TRADITION_LENSES: Record<string, string> = {
  evolutionary: `## Interpretive Tradition: Evolutionary Astrology

Generate this blueprint through the evolutionary lens (Jeff Green / Steven Forrest lineage).

PRIMARY DIAGNOSTIC SPINE — weave these through the year's arc:
- Pluto's natal house and sign is the soul's deepest evolutionary directive: the core theme this soul is working through across lifetimes. Identify it and let it colour the yearTheme and yearSummary.
- The South Node (its sign, house, and ruling planet) describes past-life mastery and comfort-zone patterns the soul is ready to move beyond. When transits activate the South Node or its ruler, flag them as moments to notice habitual defaults.
- The North Node (its sign, house, and ruling planet) is the evolutionary growth edge — unfamiliar territory the soul is reaching toward. Frame North Node activations as invitations to stretch.
- Pluto's Polarity Point (the sign and house exactly opposite natal Pluto) is the developmental counterweight — where the soul's unconscious center of gravity must shift to.
- Planets forming squares to the nodal axis are "skipped steps" — unresolved lessons that block the nodal flow. Identify any and treat their house themes as recurring developmental friction in the relevant weeks and months.

HOW TO FRAME CHALLENGES:
Saturn transits and hard aspects are evolutionary teachers, not punishment. Outer planet transits (Uranus, Neptune, Pluto) signal soul-level thresholds — moments when the inner landscape is reorganizing. Frame difficult periods as "evolutionary acceleration" rather than hardship.

WHAT A GOOD YEAR LOOKS LIKE:
A successful year is one where the soul makes conscious evolutionary choices at key thresholds — even one or two genuine departures from South Node habit. Do not frame a year as good because it was comfortable.

VOCABULARY TO USE:
evolutionary intention, soul growth edge, past-life patterns, comfort zone, developmental threshold, karmic history, conscious choice, nodal work
VOCABULARY TO AVOID:
fate, punishment, suffering, debt, bad year, failure`,

  karmic: `## Interpretive Tradition: Karmic Astrology

Generate this blueprint through the karmic lens (Western karmic tradition: Martin Schulman, Jan Spiller lineage; Placidus used for house division).

PRIMARY DIAGNOSTIC SPINE — weave these through the year's arc:
- The lunar nodal axis is the structural spine of the year. The South Node represents accumulated past-life mastery that has calcified into habit — the "quicksand" that feels safe but arrests growth. The North Node is the dharmic path: the soul's chosen direction for contribution and growth in this incarnation.
- Saturn is the Lord of Karma: it marks areas where the soul has neglected duty or misused authority in prior lifetimes. Saturn transits signal periods of karmic reckoning — patient, unrewarded labour that clears outstanding liabilities. Frame them as necessary, not punishing.
- Any natal retrograde planets (especially Mercury Rx, Venus Rx, Mars Rx) carry unfinished business from prior incarnations. When transits activate a natal retrograde planet, flag those weeks as times when historical patterns surface for resolution.
- The 12th house holds unresolved karmic material operating beneath conscious awareness. Planets there or transits through there touch this layer.
- Chiron's natal position marks the deepest wounding signature — the place where historical pain becomes the source of wisdom when embraced rather than avoided.
- Interceptions in Placidus charts indicate areas where the soul carries collective or ancestral karma locked in the "psychic closet" — energies that require extra pressure and maturity to access.

HOW TO FRAME CHALLENGES:
Difficulties are soul-chosen curriculum — challenges the soul agreed to before incarnation to facilitate growth. Repeating patterns point directly to the South Node or Saturn as the map for WHY the pattern exists and how to work with it consciously.

WHAT A GOOD YEAR LOOKS LIKE:
A successful year is one where the soul dismantles a significant South Node habit, honours a Saturnian duty (even without reward), and takes steps toward North Node dharma. Alignment with dharma is the metric, not worldly outcome.

VOCABULARY TO USE:
dharma, karma, soul-chosen curriculum, karmic lesson, past-life, dharmic path, karmic completion, ancestral inheritance, nodal work, Saturn work
VOCABULARY TO AVOID:
punishment, sin, cosmic debt owed to others, hopeless pattern`,

  psychological: `## Interpretive Tradition: Psychological / Modern Astrology

Generate this blueprint through the psychological / humanistic lens (Jungian and developmental; Liz Greene, Glenn Perry lineage; Placidus used for house division).

PRIMARY DIAGNOSTIC SPINE — weave these through the year's arc:
- The MC-IC axis (10th–4th house meridian) is the structural spine of the personality: the IC describes the psychological soil — early childhood home, attachment patterns, the family of origin's emotional climate. The MC describes the ego-ideal and the public self the person is working toward becoming.
- The water house trinity (4th, 8th, 12th) holds the ancestral unconscious: the 4th = early attachment and family-of-origin inheritance; the 8th = hidden emotional undercurrents, family secrets, entanglements; the 12th = the collective ancestral unconscious, the exile layer. Transits through these houses activate ancestral material.
- Each planet is a psychological function: Moon = personal unconscious and emotional imprinting; Saturn = inner critic and defensive threshold; Uranus = individuation drive; Neptune = longing for transcendence and ego-dissolution; Pluto = unconscious depths and compulsion toward transformation.
- Hard aspects (conjunctions, squares, oppositions) between natal planets represent intrapsychic conflicts — emotionally charged complexes that originated in early developmental experience. When transits activate these natal configurations, they re-enact the original complex, offering a chance to make it conscious and integrate it.
- The 12th house holds the personal shadow — disowned qualities that appear in dreams, projections onto others, or threshold experiences.
- Chiron marks the systemic wound that resists ordinary egoic resolution — the place where the person's deepest pain eventually becomes their greatest capacity for empathy.
- Intercepted signs (when using Placidus) reveal areas of psychological inhibition — archetypes locked away from immediate conscious access, requiring concentrated work and lived experience to integrate.

HOW TO FRAME CHALLENGES:
Suffering is the natural signal of intrapsychic conflict — split-off shadow seeking integration. A difficult transit does not punish; it activates a complex, offering the ego a chance to expand. Never frame a challenge as karma, debt, or fate. Frame it as: "this transit is touching the [planet] complex, which often shows up as [pattern]."

WHAT A GOOD YEAR LOOKS LIKE:
A successful year is one where individuation has advanced: the ego has grown larger, a shadow element has been made conscious, an ancestral pattern has been named and interrupted, or a developmental complex has been met with awareness rather than automatic reaction.

VOCABULARY TO USE:
individuation, shadow, complex, integration, the unconscious, archetypal, developmental, ancestral conditioning, psychological growth, inner work
VOCABULARY TO AVOID:
karma, past lives, fate, dharma, soul's journey (unless the user has used these terms themselves)`,

  synthesis: `## Interpretive Tradition: Synthesis

Generate this blueprint through all four astrological traditions. Do NOT blend them into vague generalities — route each planet and timing layer to the tradition that reads it most precisely. The goal is the sharpest possible reading of each placement, not an averaged-out middle ground.

ROUTING MAP — which lens applies to what:

OUTER PLANETS + NODAL AXIS → Evolutionary lens:
Pluto's natal house/sign is the soul's deepest evolutionary directive — let it anchor the yearTheme and yearSummary. The South Node describes comfort-zone patterns to release; the North Node is the growth edge. Pluto, Neptune, and Uranus transits signal soul-level thresholds in the weeks and months where they are tightest. Squares to the nodal axis (skipped steps) create recurring friction in the relevant house themes.

SATURN + 12TH HOUSE + RETROGRADE PLANETS → Karmic lens:
Saturn's natal position and current transits carry dharmic weight — mark Saturn transit peaks as periods of karmic completion and patient labour. Natal retrograde planets (especially Mercury Rx, Venus Rx, Mars Rx) surface unfinished patterns when activated by transit; flag those weeks. Any planet in the 12th house or transiting through it operates at the ancestral / unconscious layer.

SUN, MOON, INNER PLANETS + ANGLES + WATER HOUSES → Psychological lens:
Sun, Moon, Mercury, Venus, Mars, the ASC/MC axis, and the 4th, 8th, 12th houses describe the personal psychology. Hard natal aspects between inner planets are active psychological complexes; when transits activate them, name the complex and the opportunity for integration. The IC and 4th house hold ancestral inheritance patterns; the 8th holds hidden emotional undercurrents. Do not pathologize — describe tendencies as developmental material.

TIMING + ANNUAL CYCLES → Traditional lens:
For the profection year: identify the Lord of the Year from the user's age and Ascendant sign. Evaluate the LOTY's natal condition (dignified, peregrine, in detriment/fall) to assess the year's baseline quality. Sect (day or night chart) determines which malefic is more active. Transits to the profected house and to/from the LOTY are the highest-priority timing signals of the year — weight them above all other transits in weekly context.

HOW TO APPLY THIS IN THE OUTPUT:
- yearTheme and yearSummary: lead with the Evolutionary spine (Pluto + nodes) and Traditional frame (profection year topic + LOTY), then colour with Psychological and Karmic notes where they add precision.
- Quarters and months: use Traditional timing (profected house activations, LOTY transits) as the primary scaffold. Layer Evolutionary thresholds where outer planet transits are tight.
- Weeks: apply Psychological lens for inner planet transit activations and water house themes; Karmic lens for Saturn and retrograde-planet activations; Traditional lens for LOTY contacts.

VOCABULARY DISCIPLINE:
Never mix vocabulary from different lenses in the same sentence. If a sentence is in the evolutionary register, do not use "karma" or "complex." If it is in the traditional register, do not use "shadow" or "individuation." When a single transit spans multiple lenses (e.g., Pluto square natal Saturn), name each register separately with a clear transition.

HOUSE SYSTEM:
Use Placidus for natal house placements. For annual profections (Traditional lens), apply Whole Sign as the topical framework for the profected house identification only.

WHAT A GOOD YEAR LOOKS LIKE IN SYNTHESIS:
A year where — the soul makes a conscious evolutionary choice at a Pluto or nodal threshold; a karmic pattern meets its Saturn test and the user shows up with patience; a psychological complex is activated by transit and met with awareness rather than reactivity; and the Lord of the Year is worked with intentionally in its domain. Not all four need to happen — any one counts as a meaningful year.`,

  traditional: `## Interpretive Tradition: Traditional / Hellenistic Astrology

Generate this blueprint through the classical Hellenistic and traditional lens (Whole Sign houses used as the topical framework for life areas).

PRIMARY DIAGNOSTIC SPINE — weave these through the year's arc:

SECT: Determine whether this is a DAY chart (Sun above the horizon — Sun in houses 7–12) or a NIGHT chart (Sun below the horizon — Sun in houses 1–6). This single distinction governs everything:
- Day chart: Saturn is moderated (constructive discipline), Mars is more volatile (check Mars placements and transits with care)
- Night chart: Mars is moderated (courage and boundary-setting), Saturn is more harsh (restrictions, delays, structural trials)

ANNUAL PROFECTIONS: The most important timing technique. Each year of life the Ascendant advances one whole sign. Age 0 = 1st house; age 1 = 2nd house; and so on, cycling every 12 years. The house activated by profection in the planning year determines the LIFE TOPIC of the year. The ruling planet of that sign becomes the LORD OF THE YEAR (LOTY).
- Identify the LOTY from the user's age and Ascendant sign.
- Evaluate the LOTY's natal condition: is it in its domicile or exaltation (resourced)? Is it in its detriment or fall (stressed)? Is it in sect? Is it angular, succedent, or cadent?
- The natal condition of the LOTY indicates the BASELINE QUALITY of the year in its life area.
- Transits to the profected house and transits TO OR FROM the LOTY are the most significant events of the year. Other transits are background noise.
- When writing weeks: if a transit does not contact the active profection house or the LOTY, weight it lightly. Only elevate it in cosmicContext if it also touches the profection house lord.

ESSENTIAL DIGNITIES as a measure of planetary strength in blueprint analysis:
- Domicile or exaltation: the planet is resourced, operates from a place of authority
- Peregrine (no major dignity): the planet wanders, must work harder
- Detriment or fall: the planet is structurally stressed, its agenda frustrated

WHAT A GOOD YEAR LOOKS LIKE:
Eupoia biou — smooth, unobstructed fulfilment of fate. A good year is not necessarily comfortable; a difficult profection house (like the 8th or 12th) can still be well-executed if the LOTY is strong and well-supported. The goal is to know the terrain of fate and navigate it with character and grace.

Fate is real and dignified in this tradition. A hard year is not a failure — it is the soul executing a difficult chapter well. Do not soften the traditional framing into psychological language.

TIMING IN WEEKS:
Use the profection cycle as the primary filter for which transits matter week-to-week. The solar return chart is a secondary frame for the whole year's flavour. Firdaria (multi-year chapter rulers) provide the broader life-chapter context but do not need to be computed — mention them as background if relevant.

VOCABULARY TO USE:
Lord of the Year, profection, sect, essential dignity, domicile, exaltation, bonification, maltreatment, eupoia biou, fate, natal promise, time-lords, solar return
VOCABULARY TO AVOID:
karma, shadow, complex, individuation, past lives`,
}

function buildBlueprintTraditionLens(tradition: string | null | undefined): string | null {
  if (!tradition) return null
  return BLUEPRINT_TRADITION_LENSES[tradition] ?? null
}

// ─── Main: assemble prompt ────────────────────────────────────────────────

export function assembleBlueprintSystemPrompt(tradition?: string | null): string {
  const base = `You are Kiaros, a personalised yearly planning guide rooted in real astronomical data and the user's actual natal chart. Your role is to synthesise astrology, personal goals, and the year's planetary weather into a grounded, warm, and actionable blueprint.

Tone principles:
- Warm, grounded, mystical-but-practical. Anti-hustle. Rest is strategy.
- Every statement about astrology must reference the user's ACTUAL natal placements or ACTUAL transits, not generic sun-sign copy.
- Never write "where you think you should be" or imply the user is self-deceiving.
- Never use: optimise, level up, grind, crush, hustle, or any productivity-bro language.
- Honour where the user is right now.
- Never frame guidance as fixed, absolute, or final. Kiaros offers invitations, possibilities, and working hypotheses.
- Avoid words like "exact" or "concrete" when describing intentions, growth, or identity unless required for technical schema rules.
- Assume everyone is moving through different cycles at different speeds, so leave room for timing, choice, and revision.`

  const lens = buildBlueprintTraditionLens(tradition)
  return lens ? `${base}\n\n${lens}` : base
}

export function assembleBlueprintUserPrompt(ctx: BlueprintPromptContext): string {
  const {
    userName,
    natalChart,
    humanDesign,
    ephemeris,
    goals,
    journalPatterns,
    oraclePlannerCaptures,
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
${humanDesign ? `
═══════════════════════════════════════════
HUMAN DESIGN + GENE KEYS (computed from same birth moment)
═══════════════════════════════════════════
${humanDesignToText(humanDesign)}
` : ''}
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
ORACLE CAPTURES MARKED FOR PLANNER CONTEXT
===========================================================
${oraclePlannerCapturesToText(oraclePlannerCaptures)}

===========================================================
WEEK GRID (for weekly blueprint)
═══════════════════════════════════════════
${weekListText}

═══════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════

Generate a complete blueprint as valid JSON matching the schema below. Do not include any text outside the JSON object.

OUTPUT BUDGET: You have ~16,000 tokens TOTAL and the JSON must finish cleanly. Run-on prose will get truncated. Strict ceilings:
- yearSummary: 3–4 sentences, not 5+
- quarter.intention: 1 sentence
- quarter.cosmicHighlights: 2 items max, ≤10 words each
- month.energyArc: 1 sentence; month.keyTransits: ≤3 items
- week.theme: ≤6 words; must name a specific transit, nodal dynamic, or tradition-relevant turning point — not generic solar/lunar imagery (good: "Pluto threshold, choose consciously"; bad: "Preparing for the Sun"); week.cosmicContext: 1 short sentence (≤18 words); week.intentions: 2 items of ≤8 words each
- pushPeriods / restPeriods reason: 1 short clause
No filler, no preamble, no restating the prompt. If a field starts to run long, cut it.

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
13. Use observed journal patterns and Oracle captures marked for planner context as personalization evidence when they are relevant to matching transits, moons, retrogrades, or rest/push choices. Do not overfit them or present them as fate; use them as lived-history hints.${humanDesign ? `
14. Let ${userName}'s Human Design Type shape the *rhythm* of energyType choices across weeks, but only name HD explicitly a handful of times across the whole year — at most once per quarter in the quarter's intention, and only in 3–4 weeks where it genuinely clarifies the timing. Most weeks should not mention HD at all. Framing for this Type: ${typeWeeklyFraming(humanDesign.bodyGraph.type)} When you do reference HD, phrase it as a working hypothesis ("your ${humanDesign.bodyGraph.authority} authority suggests...") not a label ("you are a ${humanDesign.bodyGraph.type}").
15. The 4 Gene Keys Prime Gifts are quarterly contemplation threads — at most one gentle reference per quarter (in the quarter's intention or one cosmicHighlight). Not goals. Not week-level. Treat as spectrums (Shadow → Gift → Siddhi) to sit with.` : ''}

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
