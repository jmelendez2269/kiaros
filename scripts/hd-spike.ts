/**
 * scripts/hd-spike.ts
 *
 * Methodology spike for the Human Design + Gene Keys integration.
 *
 * Computes the Personality and Design charts for one or more reference births,
 * derives the BodyGraph (Type / Authority / Profile / defined Centers /
 * activated Channels), and prints the Gene Keys Activation Sequence (Life's
 * Work / Evolution / Radiance / Purpose).
 *
 * Run with:
 *   npx tsx scripts/hd-spike.ts
 *
 * To plug in a different birth, edit the CHARTS array below.
 *
 * IMPORTANT — validation:
 *   The gate-wheel anchor (Gate 41 at 2° Aquarius) and gate sequence used in
 *   this spike are the most-cited canonical values, but small offsets between
 *   HD calculators do exist. Before integrating with the blueprint prompt,
 *   cross-check at least one chart against MyBodyGraph or Jovian Archive.
 */

import { computeNatalChart } from '../lib/ephemeris/astronomia-adapter'
import type { BirthData } from '../lib/ephemeris/astronomia-adapter'
import { computeDesignAndPersonality } from '../lib/ephemeris/human-design/design-chart'
import { deriveBodyGraph } from '../lib/ephemeris/human-design/bodygraph'
import { deriveActivationSequence } from '../lib/ephemeris/human-design/gene-keys'
import { formatGateLine } from '../lib/ephemeris/human-design/gate-wheel'

interface ReferenceChart {
  label: string
  birth: BirthData
  notes?: string
}

const CHARTS: ReferenceChart[] = [
  {
    label: 'Ra Uru Hu (founder of Human Design)',
    birth: {
      date: '1948-04-09',
      time: '22:39',
      timezone: 'Asia/Beirut',
      lat: 33.8938,
      lng: 35.5018,
      timeUnknown: false,
    },
    notes: 'Public chart, widely documented. Use for cross-checking against MyBodyGraph.',
  },
  {
    label: 'Steve Jobs',
    birth: {
      date: '1955-02-24',
      time: '19:15',
      timezone: 'America/Los_Angeles',
      lat: 37.7749,
      lng: -122.4194,
      timeUnknown: false,
    },
    notes: 'Public chart, commonly used in HD examples.',
  },
  {
    label: 'Generic 1990 noon birth (no time precision)',
    birth: {
      date: '1990-06-15',
      time: '12:00',
      timezone: 'America/New_York',
      lat: 40.7128,
      lng: -74.006,
      timeUnknown: false,
    },
    notes: 'Synthetic — useful only as a sanity check that the pipeline runs.',
  },
]

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

function fmt(n: number, digits = 4): string {
  return n.toFixed(digits).padStart(8 + digits)
}

function printChart(ref: ReferenceChart): void {
  console.log('━'.repeat(80))
  console.log(`▸ ${ref.label}`)
  console.log(`  Born: ${ref.birth.date} ${ref.birth.time} ${ref.birth.timezone} (${ref.birth.lat}, ${ref.birth.lng})`)
  if (ref.notes) console.log(`  ${ref.notes}`)
  console.log('━'.repeat(80))

  const natal = computeNatalChart(ref.birth)
  console.log('\n  Western natal chart (existing Kiaros engine):')
  console.log(`    Sun ${pad(natal.sun.sign, 12)} ${fmt(natal.sun.degree, 2)}°   Moon ${pad(natal.moon.sign, 12)} ${fmt(natal.moon.degree, 2)}°   Rising ${natal.rising}`)

  const { personality, design, edgeCases } = computeDesignAndPersonality(ref.birth)

  console.log('\n  Human Design activations (Personality / Design):')
  const keys = ['sun','earth','moon','northNode','southNode','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'] as const
  for (const k of keys) {
    const p = personality.activations[k]
    const d = design.activations[k]
    console.log(`    ${pad(k, 11)}  P: ${pad(formatGateLine(p), 8)} (${fmt(p.longitude, 3)}°)    D: ${pad(formatGateLine(d), 8)} (${fmt(d.longitude, 3)}°)`)
  }
  const designDate = new Date(design.utcMs).toISOString().slice(0, 19).replace('T', ' ')
  console.log(`    Design moment (UTC): ${designDate}  (Δ = ${((personality.utcMs - design.utcMs) / 86400000).toFixed(3)} days)`)

  const bg = deriveBodyGraph(personality, design)
  console.log('\n  BodyGraph summary:')
  console.log(`    Type:        ${bg.type}`)
  console.log(`    Strategy:    ${bg.strategy}`)
  console.log(`    Authority:   ${bg.authority}`)
  console.log(`    Profile:     ${bg.profile} (${bg.profileName})`)
  console.log(`    Signature:   ${bg.signature}    Not-self: ${bg.notSelf}`)
  console.log(`    Defined:     ${bg.definedCenters.join(', ') || '— none —'}`)
  console.log(`    Undefined:   ${bg.undefinedCenters.join(', ')}`)
  console.log(`    Activated channels (${bg.activatedChannels.length}):`)
  for (const c of bg.activatedChannels) {
    console.log(`      ${c.gates[0]}–${c.gates[1]}  ${c.name}`)
  }

  if (edgeCases.length > 0) {
    console.log(`\n  Edge cases (within 0.2° of a gate boundary — flag for MBG cross-check):`)
    for (const e of edgeCases) {
      console.log(`    ${pad(e.side, 11)} ${pad(e.key, 10)} gate ${e.gate}.${e.line} — ${e.boundaryDistance.toFixed(4)}° from boundary`)
    }
  }

  const seq = deriveActivationSequence(personality, design)
  console.log('\n  Gene Keys — Activation Sequence (Prime Gifts):')
  for (const sphere of ['lifesWork', 'evolution', 'radiance', 'purpose'] as const) {
    const g = seq[sphere]
    console.log(`    ${pad(g.label, 11)}  ${g.geneKey}.${g.line}`)
    console.log(`                 Shadow:  ${g.shadow}`)
    console.log(`                 Gift:    ${g.gift}`)
    console.log(`                 Siddhi:  ${g.siddhi}`)
  }

  console.log()
}

console.log('\nKiaros · HD + Gene Keys methodology spike\n')
for (const ref of CHARTS) {
  try {
    printChart(ref)
  } catch (err) {
    console.error(`Error processing ${ref.label}:`, err)
  }
}
console.log('━'.repeat(80))
console.log('Done. Cross-check at least one chart at https://www.mybodygraph.com/ before')
console.log('feeding these signals into the blueprint prompt.\n')
