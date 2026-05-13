/**
 * lib/oracle/preseed.ts
 *
 * Shared helpers for "Ask Oracle about this …" deep-links on the dashboard
 * and Sky Portrait.
 *
 * Two transports depending on entitlement:
 *  - Planner + Oracle users: we write the pre-seed prompt to sessionStorage
 *    and navigate to /oracle. The chat page consumes it on mount and
 *    dispatches it as the first user message.
 *  - Planner-only users: the same prompt is POSTed to /api/oracle/explain
 *    inline (no chat back-and-forth) so non-Oracle subscribers still get
 *    synthesis for the surface they clicked. See ORACLE_EXPLAIN_MONTHLY_LIMIT.
 *
 * The system prompt already carries the full chart + transits, so these
 * builders only need to identify *which* placement / transit / signal the
 * user is asking about, not re-state the chart.
 */

import type { PlacementExplanation, DailySignal, SkyTimelineEntry } from '@/lib/human-design'

const SESSION_STORAGE_KEY = 'kiaros.oracle.preseed'

// ─── Session-storage transport ─────────────────────────────────────────

export function writeOraclePreseed(prompt: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, prompt)
  } catch {
    // Storage can throw in private mode or when full. Swallow — the
    // Oracle page will fall back to its empty state.
  }
}

export function consumeOraclePreseed(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (value) window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return value
  } catch {
    return null
  }
}

// ─── Prompt builders ───────────────────────────────────────────────────

function houseOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function buildPlacementPrompt(explanation: PlacementExplanation): string {
  const { kind, planet, sign, degreeInSign, house, isRetrograde, activeAspects } = explanation
  const degree = `${degreeInSign.toFixed(1)}° ${sign}`
  const housePart = house ? ` in the ${houseOrdinal(house)} House` : ''
  const rxPart = isRetrograde ? ' retrograde' : ''

  const subject = kind === 'natal'
    ? `my natal ${planet} at ${degree}${housePart}`
    : `${planet}${rxPart} currently at ${degree} in the sky`

  if (activeAspects.length === 0) {
    return `Tell me about ${subject}. There are no exact aspects on this point today — what does it mean for me on its own?`
  }

  const aspectList = activeAspects
    .slice(0, 3)
    .map((a) => `${a.label.toLowerCase()} (orb ${a.orb.toFixed(1)}°, ${a.applying ? 'applying' : 'separating'})`)
    .join('; ')

  return `Tell me about ${subject} — particularly with ${aspectList} active right now.`
}

export function buildTransitPrompt(entry: SkyTimelineEntry): string {
  const { planet, aspect, natalPlanet, status, durationDays, rarityLabel, periodLabel } = entry
  const windowPhrase = status === 'active'
    ? `this ${formatDuration(durationDays)} window`
    : `this upcoming ${formatDuration(durationDays)} window`
  const rarityNote = `${rarityLabel.toLowerCase()} — ${periodLabel}`

  return `Tell me about ${planet} ${aspect} my natal ${natalPlanet} — what does ${windowPhrase} mean given my chart and what I'm working on? Context: this transit is ${rarityNote}.`
}

export function buildSignalPrompt(signal: DailySignal): string {
  return `On the dashboard today, this signal is showing for me: "${signal.label} — ${signal.technical}. ${signal.plain}". Why does this matter today, specifically for me?`
}

function formatDuration(days: number): string {
  if (days <= 1) return '1-day'
  if (days < 14) return `${days}-day`
  if (days < 60) return `${Math.round(days / 7)}-week`
  if (days < 365) return `${Math.round(days / 30)}-month`
  const years = days / 365
  return years >= 1.5 ? `${years.toFixed(1)}-year` : 'year-long'
}
