/**
 * scripts/recompute-all-charts.ts
 *
 * Unconditionally recomputes natal_chart for every profile with known birth
 * data, using each profile's own house_system (or whole_sign if unset).
 * Needed after the Ascendant formula fix in astronomia-adapter.ts (it was
 * returning the Descendant, 180° off) — every existing chart is stale.
 *
 * Usage:
 *   npx tsx scripts/recompute-all-charts.ts          # dry run
 *   npx tsx scripts/recompute-all-charts.ts --apply
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal(): void {
  const path = resolve(__dirname, '../.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

import { createClient } from '@supabase/supabase-js'
import { computeNatalChart, type BirthData } from '../lib/ephemeris/astronomia-adapter'
import type { HouseSystem } from '../types/blueprint'

const APPLY = process.argv.includes('--apply')

interface ProfileRow {
  id: string
  email: string
  birth_date: string | null
  birth_time: string | null
  birth_time_unknown: boolean | null
  birth_tz: string | null
  birth_lat: number | null
  birth_lng: number | null
  house_system: string | null
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: rows, error } = await admin
    .from('user_profiles')
    .select('id, email, birth_date, birth_time, birth_time_unknown, birth_tz, birth_lat, birth_lng, house_system')
    .not('birth_date', 'is', null)
    .not('birth_lat', 'is', null)
    .not('birth_lng', 'is', null)

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — ${rows?.length ?? 0} profile(s)\n`)

  for (const row of (rows ?? []) as ProfileRow[]) {
    const houseSystem = (row.house_system as HouseSystem | null) ?? 'whole_sign'
    const birthData: BirthData = {
      date: row.birth_date!,
      time: row.birth_time,
      timezone: row.birth_tz,
      lat: row.birth_lat!,
      lng: row.birth_lng!,
      timeUnknown: row.birth_time_unknown ?? false,
    }

    try {
      const natalChart = computeNatalChart(birthData, houseSystem)
      console.log(
        `${row.email} (${row.id}): house_system=${houseSystem}  rising=${natalChart.rising}  asc=${natalChart.ascendantLongitude?.toFixed(2)}  cusps=${natalChart.houseCusps?.length ?? 0}`
      )
      if (APPLY) {
        const { error: updateError } = await admin
          .from('user_profiles')
          .update({ natal_chart: natalChart as unknown as Record<string, unknown> })
          .eq('id', row.id)
        if (updateError) throw updateError
      }
    } catch (err) {
      console.error(`  FAILED for ${row.email}:`, err)
    }
  }
  console.log(`\nDone.${APPLY ? '' : ' Re-run with --apply to write.'}\n`)
}

main()
