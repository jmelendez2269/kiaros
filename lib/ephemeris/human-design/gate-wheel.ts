/**
 * gate-wheel.ts
 *
 * Maps tropical ecliptic longitude → I Ching gate / line / color / tone / base.
 *
 * Conventions used here (must be validated against MyBodyGraph / Jovian Archive
 * before the math is trusted for production prompt integration):
 *
 *  - Gate 41 begins at 2°00'00" Aquarius = exactly 302.000° tropical longitude.
 *  - Each gate spans 5.625° (= 360 / 64).
 *  - Each gate divides into 6 lines (0.9375° each).
 *  - Each line divides into 6 colors (~0.15625° each).
 *  - Each color divides into 6 tones (~0.026° each).
 *  - Each tone divides into 5 bases (~0.0052° each).
 *
 * The sequence of gates going counterclockwise (in the direction of increasing
 * tropical longitude) from Gate 41 is the canonical Rave Mandala order.
 */

const GATE_WIDTH_DEG = 360 / 64                  // 5.625
const LINE_WIDTH_DEG = GATE_WIDTH_DEG / 6        // 0.9375
const COLOR_WIDTH_DEG = LINE_WIDTH_DEG / 6       // 0.15625
const TONE_WIDTH_DEG = COLOR_WIDTH_DEG / 6       // ~0.026
const BASE_WIDTH_DEG = TONE_WIDTH_DEG / 5        // ~0.0052

// Calibrated against MyBodyGraph using Ra Uru Hu's chart with the canonical
// Rave Mandala order (see GATE_SEQUENCE below): matches Sun, Earth, Moon, NN,
// SN, Mercury, Venus, Mars, Jupiter, Saturn, Neptune, and most line numbers at
// 302.25° (15 arc-min later than the often-cited "exactly 2° Aquarius" value).
// Sub-line precision drift in a few slow planets remains and is not chased.
const GATE_41_START_LONGITUDE = 302.25

/**
 * Canonical 64-gate sequence around the wheel, starting from Gate 41 at 302°
 * and proceeding in the direction of increasing tropical longitude.
 */
// Four signs hold 6 starting gates (Pisces, Gemini, Virgo, Sagittarius);
// the other eight hold 5 each — total 4·6 + 8·5 = 64.
export const GATE_SEQUENCE: readonly number[] = [
  // Aquarius   (5): idx 0–4
  41, 19, 13, 49, 30,
  // Pisces     (6): idx 5–10
  55, 37, 63, 22, 36, 25,
  // Aries      (5): idx 11–15
  17, 21, 51, 42, 3,
  // Taurus     (5): idx 16–20
  27, 24, 2, 23, 8,
  // Gemini     (6): idx 21–26
  20, 16, 35, 45, 12, 15,
  // Cancer     (5): idx 27–31
  52, 39, 53, 62, 56,
  // Leo        (5): idx 32–36
  31, 33, 7, 4, 29,
  // Virgo      (6): idx 37–42
  59, 40, 64, 47, 6, 46,
  // Libra      (5): idx 43–47
  18, 48, 57, 32, 50,
  // Scorpio    (5): idx 48–52
  28, 44, 1, 43, 14,
  // Sagittarius (6): idx 53–58
  34, 9, 5, 26, 11, 10,
  // Capricorn  (5): idx 59–63
  58, 38, 54, 61, 60,
] as const

if (GATE_SEQUENCE.length !== 64) {
  throw new Error(`gate-wheel: expected 64 gates in sequence, got ${GATE_SEQUENCE.length}`)
}

export interface GateActivation {
  gate: number      // 1-64
  line: number      // 1-6
  color: number     // 1-6
  tone: number      // 1-6
  base: number      // 1-5
  boundaryDistance: number  // degrees to nearest gate boundary
}

// Documented VSOP87B vs JPL DE431 longitude drift at our era is ≤0.17°.
// Activations within this distance of a gate boundary may disagree with
// MyBodyGraph at the gate level; surface to the user for cross-check.
export const GATE_BOUNDARY_PROXIMITY_THRESHOLD = 0.2

export function isNearGateBoundary(activation: GateActivation): boolean {
  return activation.boundaryDistance < GATE_BOUNDARY_PROXIMITY_THRESHOLD
}

/** Normalize to [0, 360). */
function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * Convert a tropical ecliptic longitude (degrees) into an I Ching activation
 * (gate / line / color / tone / base).
 */
export function longitudeToActivation(longitude: number): GateActivation {
  const lon = normalizeDeg(longitude)

  // Position around the wheel relative to Gate 41's start.
  const wheelOffset = normalizeDeg(lon - GATE_41_START_LONGITUDE)

  const gateIndex = Math.floor(wheelOffset / GATE_WIDTH_DEG)
  const gate = GATE_SEQUENCE[gateIndex]!

  const withinGate = wheelOffset - gateIndex * GATE_WIDTH_DEG
  const line = Math.floor(withinGate / LINE_WIDTH_DEG) + 1

  const withinLine = withinGate - (line - 1) * LINE_WIDTH_DEG
  const color = Math.floor(withinLine / COLOR_WIDTH_DEG) + 1

  const withinColor = withinLine - (color - 1) * COLOR_WIDTH_DEG
  const tone = Math.floor(withinColor / TONE_WIDTH_DEG) + 1

  const withinTone = withinColor - (tone - 1) * TONE_WIDTH_DEG
  const base = Math.min(5, Math.floor(withinTone / BASE_WIDTH_DEG) + 1)

  const boundaryDistance = Math.min(withinGate, GATE_WIDTH_DEG - withinGate)

  return { gate, line, color, tone, base, boundaryDistance }
}

/**
 * Format a gate activation as "Gate.Line" — the most common HD shorthand.
 * Example: { gate: 11, line: 4 } → "11.4"
 */
export function formatGateLine(activation: GateActivation): string {
  return `${activation.gate}.${activation.line}`
}

/**
 * Format a gate activation with full precision: "11.4.2.3.1"
 */
export function formatActivationFull(a: GateActivation): string {
  return `${a.gate}.${a.line}.${a.color}.${a.tone}.${a.base}`
}
