/**
 * scripts/hd-sun-precision-probe.ts
 *
 * B1.6 diagnostic: compare solar.apparentLongitude (Meeus ch.25, low-precision)
 * vs solar.apparentVSOP87 for Ra Uru Hu's birth, and propagate the difference
 * through the activations to see if it closes the 5 sub-line mismatches
 * against MyBodyGraph.
 *
 * Run: npx tsx scripts/hd-sun-precision-probe.ts
 */

import {
  solar,
  nutation,
  elliptic,
  planetposition,
  pluto as plutoModule,
  coord,
} from 'astronomia'
import { birthLocalToUTC } from '../lib/ephemeris/astronomia-adapter'
import { longitudeToActivation, formatGateLine } from '../lib/ephemeris/human-design/gate-wheel'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bearth = require('astronomia/data/vsop87Bearth').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bmercury = require('astronomia/data/vsop87Bmercury').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Buranus = require('astronomia/data/vsop87Buranus').default
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vsop87Bneptune = require('astronomia/data/vsop87Bneptune').default

const earthPlanet = new (planetposition as any).Planet(vsop87Bearth)
const mercuryPlanet = new (planetposition as any).Planet(vsop87Bmercury)
const uranusPlanet = new (planetposition as any).Planet(vsop87Buranus)
const neptunePlanet = new (planetposition as any).Planet(vsop87Bneptune)

const DEG = 180 / Math.PI
const SUN_MEAN_MOTION_DEG_PER_DAY = 360 / 365.2422

const norm = (d: number) => ((d % 360) + 360) % 360
const msToJDE = (ms: number) => 2440587.5 + ms / 86400000
const jdeToT = (jde: number) => (jde - 2451545.0) / 36525
const fmt = (lon: number): string => formatGateLine(longitudeToActivation(lon))

function getObliquity(jde: number): number {
  const [, dEps] = (nutation as any).nutation(jde) as [number, number]
  return ((nutation as any).meanObliquity(jde) as number) + dEps
}

// Method A — current production: low-precision Meeus ch.25 polynomial
function sunLonLowPrecision(jde: number): number {
  const T = jdeToT(jde)
  return norm(((solar as any).apparentLongitude(T) as number) * DEG)
}

// Method B — VSOP87 + FK5 + nutation + aberration (matches other planets)
function sunLonVSOP87(jde: number): number {
  const c = (solar as any).apparentVSOP87(earthPlanet, jde) as { lon: number }
  return norm(c.lon * DEG)
}

function planetLon(planet: unknown, jde: number): number {
  const eps = getObliquity(jde)
  const { ra, dec } = (elliptic as any).position(planet, earthPlanet, jde) as { ra: number; dec: number }
  return norm((new (coord as any).Equatorial(ra, dec).toEcliptic(eps).lon as number) * DEG)
}

function plutoLon(jde: number): number {
  const eps = getObliquity(jde)
  const { ra, dec } = (plutoModule as any).astrometric(jde, earthPlanet) as { ra: number; dec: number }
  return norm((new (coord as any).Equatorial(ra, dec).toEcliptic(eps).lon as number) * DEG)
}

function signedDelta(from: number, to: number): number {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

function solveDesignJDE(natalSunLon: number, seedJDE: number, sunFn: (jde: number) => number): number {
  const target = norm(natalSunLon - 88)
  let jde = seedJDE
  for (let i = 0; i < 12; i++) {
    const cur = sunFn(jde)
    const err = signedDelta(cur, target)
    if (Math.abs(err) < 1e-7) return jde
    jde += err / SUN_MEAN_MOTION_DEG_PER_DAY
  }
  return jde
}

const utc = birthLocalToUTC('1948-04-09', '22:39', 'Asia/Beirut')
const personalityJDE = msToJDE(utc.getTime())
const seedJDE = personalityJDE - 88 / SUN_MEAN_MOTION_DEG_PER_DAY

const sunA = sunLonLowPrecision(personalityJDE)
const sunB = sunLonVSOP87(personalityJDE)
const designJDE_A = solveDesignJDE(sunA, seedJDE, sunLonLowPrecision)
const designJDE_B = solveDesignJDE(sunB, seedJDE, sunLonVSOP87)

console.log('Ra Uru Hu — Sun precision probe')
console.log('───────────────────────────────────────────────────────────────')
console.log(`Personality JDE: ${personalityJDE.toFixed(6)}`)
console.log()
console.log(`P Sun  low-precision (current)  ${sunA.toFixed(6)}°  → ${fmt(sunA)}`)
console.log(`P Sun  VSOP87                   ${sunB.toFixed(6)}°  → ${fmt(sunB)}`)
console.log(`Δ (VSOP87 − current)            ${(sunB - sunA).toFixed(6)}° = ${((sunB - sunA) * 3600).toFixed(2)} arcsec`)
console.log()
console.log(`Design JDE current ${designJDE_A.toFixed(6)}`)
console.log(`Design JDE VSOP87  ${designJDE_B.toFixed(6)}`)
console.log(`Δ JDE              ${((designJDE_B - designJDE_A) * 86400).toFixed(2)} sec`)
console.log()
console.log('Activation comparison (current / VSOP87 / MBG):')
console.log()

const pEarthA = norm(sunA + 180)
const pEarthB = norm(sunB + 180)
console.log(`P Earth     current ${fmt(pEarthA).padEnd(6)}  VSOP87 ${fmt(pEarthB).padEnd(6)}  MBG 57.6`)

const pMerc = planetLon(mercuryPlanet, personalityJDE)
console.log(`P Mercury   current ${fmt(pMerc).padEnd(6)}  VSOP87 ${fmt(pMerc).padEnd(6)}  MBG 25.4   (lon=${pMerc.toFixed(6)}°, P-side independent of Sun method)`)

const pUran = planetLon(uranusPlanet, personalityJDE)
console.log(`P Uranus    current ${fmt(pUran).padEnd(6)}  VSOP87 ${fmt(pUran).padEnd(6)}  MBG 12.1   (lon=${pUran.toFixed(6)}°, gate-12 boundary at 82.875°)`)

const pNept = planetLon(neptunePlanet, personalityJDE)
console.log(`P Neptune   current ${fmt(pNept).padEnd(6)}  VSOP87 ${fmt(pNept).padEnd(6)}  MBG 48.3   (lon=${pNept.toFixed(6)}°)`)

const dEarthA = norm(sunLonLowPrecision(designJDE_A) + 180)
const dEarthB = norm(sunLonVSOP87(designJDE_B) + 180)
console.log(`D Earth     current ${fmt(dEarthA).padEnd(6)}  VSOP87 ${fmt(dEarthB).padEnd(6)}  MBG 62.2`)

const dPlutoA = plutoLon(designJDE_A)
const dPlutoB = plutoLon(designJDE_B)
console.log(`D Pluto     current ${fmt(dPlutoA).padEnd(6)}  VSOP87 ${fmt(dPlutoB).padEnd(6)}  MBG  7.2   (regression check)`)
