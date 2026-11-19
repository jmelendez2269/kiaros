/**
 * Pure helpers for the new-member sky on the Insights home: how far the member
 * is from their first pattern, and where the stars and the faint outlines sit.
 * No server imports, so it is unit-testable.
 */
import { ESTABLISHED_PATTERN_MIN_SAMPLE } from '@/lib/journal/pattern-discoveries'

/** The most stars drawn for entries so far. Past this the sky has long since formed. */
export const MAX_ENTRY_STARS = 10

export interface FirstPatternProgress {
  /** Entries under the sky the member has written under most. */
  have: number
  /** Entries a sky needs before it counts as a pattern. */
  of: number
  /** Entries still to come under that sky. 0 once a pattern has formed. */
  toGo: number
}

/** "1 of N" toward the first pattern. N is the app's own threshold for an established pattern. */
export function firstPatternProgress(patternCounts: number[]): FirstPatternProgress {
  const of = ESTABLISHED_PATTERN_MIN_SAMPLE
  const best = Math.max(0, ...patternCounts.filter((n) => Number.isFinite(n)))
  const have = Math.min(best, of)
  return { have, of, toGo: of - have }
}

/** The new-member sky shows until a first pattern has enough entries to count as one. */
export function isSkyBeginning(patternCounts: number[]): boolean {
  return firstPatternProgress(patternCounts).toGo > 0
}

export interface SkyPoint {
  x: number
  y: number
}

export interface NewMemberLayout {
  /** Stars for entries under the member's strongest sky, joined in order. */
  shared: SkyPoint[]
  /** Faint outlines for entries still to come under that sky. */
  ghosts: SkyPoint[]
  /** Stars for entries that sit under skies of their own so far. */
  loose: SkyPoint[]
}

/** Anchor points on a 1000 x 340 canvas. The shared cluster arcs left to right; loose stars sit above it. */
const CLUSTER: SkyPoint[] = [
  { x: 320, y: 180 },
  { x: 380, y: 215 },
  { x: 440, y: 175 },
  { x: 500, y: 210 },
  { x: 560, y: 175 },
]
const LOOSE: SkyPoint[] = [
  { x: 150, y: 250 }, { x: 215, y: 90 }, { x: 640, y: 105 }, { x: 705, y: 260 }, { x: 790, y: 120 },
  { x: 860, y: 245 }, { x: 930, y: 105 }, { x: 110, y: 160 }, { x: 600, y: 290 }, { x: 760, y: 50 },
]

/**
 * `entries` stars in all, `sharedBest` of them under one sky. The rest of the
 * cluster, up to the pattern threshold, is drawn as outlines.
 */
export function layoutNewMemberSky(entries: number, sharedBest: number): NewMemberLayout {
  const { of } = firstPatternProgress([])
  const total = Math.min(Math.max(0, Math.floor(entries)), MAX_ENTRY_STARS)
  const shared = Math.min(Math.max(0, Math.floor(sharedBest)), total, of)
  const ghostCount = Math.max(0, of - shared)
  return {
    shared: CLUSTER.slice(0, shared),
    ghosts: CLUSTER.slice(shared, shared + ghostCount),
    loose: LOOSE.slice(0, Math.max(0, total - shared)),
  }
}
