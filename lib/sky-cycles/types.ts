import type { AspectType, Planet, ZodiacSign } from '@/types/blueprint'

/**
 * A "sky cycle" is a happening with a beginning and an end that a member can
 * prepare for, move through, and look back on.
 *
 * Collective cycles are the same for everyone (retrogrades, eclipses, slow
 * planets changing sign, seasons). Personal cycles are slow-planet transits to
 * the member's own chart.
 */
export type SkyCycleKind = 'retrograde' | 'eclipse' | 'ingress' | 'season' | 'personal_transit'

export type NatalPoint = 'Sun' | 'Moon' | 'Ascendant' | 'Midheaven'

export interface SkyCycle {
  /** Stable id, e.g. "retrograde:Mercury:2026-11-09". */
  id: string
  kind: SkyCycleKind
  scope: 'collective' | 'personal'
  /** Short title, e.g. "Mercury retrograde". */
  title: string
  /** One line of plain context, e.g. "in Sagittarius, Nov 9 to Nov 29". */
  subtitle: string
  /** First day of the cycle (YYYY-MM-DD). */
  startDate: string
  /** Last day of the cycle (YYYY-MM-DD). The look back opens after this. */
  endDate: string
  /** Days before startDate to show a heads-up. */
  headsUpDays: number
  /** Key dates inside the cycle (exact hits, eclipse day). */
  keyDates: string[]
  planet?: Planet
  sign?: ZodiacSign
  /** personal_transit only */
  natalPoint?: NatalPoint
  aspect?: AspectType
  /** eclipse only */
  eclipseType?: 'solar' | 'lunar'
  /** season only */
  seasonName?: 'spring' | 'summer' | 'autumn' | 'winter'
  /**
   * Groups cycles that repeat so we can find "last time": e.g.
   * "retrograde:Mercury", "eclipse", "season:winter", "personal:Saturn:square:Sun".
   */
  familyKey: string
}

export type SkyCyclePhase = 'upcoming' | 'active' | 'ended'

export interface SkyCycleStatus {
  cycle: SkyCycle
  phase: SkyCyclePhase
  /** upcoming: days until start. active: day number (1-based). ended: days since end. */
  dayCount: number
  /** Total length of the cycle in days. */
  totalDays: number
}
