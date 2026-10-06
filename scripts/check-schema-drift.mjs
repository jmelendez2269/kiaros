#!/usr/bin/env node
/**
 * Fails when the repo's migrations declare a table or column that the live
 * database does not actually have.
 *
 * Why not just diff `supabase_migrations.schema_migrations` against the
 * migration filenames? Because that table is not a reliable record here — a
 * number of migrations in this repo were applied through the SQL editor and
 * were never recorded in it, so a filename diff produces permanent false
 * positives and gets ignored. That is how 0036_retention_emails sat unapplied
 * while the deployed layout wrote `user_profiles.last_seen_at` on every
 * render. Checking the objects themselves has no such blind spot.
 *
 * Probing goes through PostgREST with the service-role key, so this needs no
 * direct Postgres connection and no extra dependency:
 *   - table:  GET /rest/v1/<table>?limit=0                 404 => missing
 *   - column: GET /rest/v1/<table>?select=<col>&limit=0     400 => missing
 *
 * Scope: public-schema tables and columns reachable through PostgREST. It does
 * not verify functions, policies, indexes, constraints or defaults.
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error(
    'check-schema-drift: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
  )
  process.exit(2)
}

/** Strip line and block comments so commented-out DDL is not parsed as real. */
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
}

function clean(identifier) {
  return identifier.replace(/"/g, '').replace(/^public\./i, '').toLowerCase()
}

const RE_CREATE_TABLE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w.]+"?)/gi
const RE_DROP_TABLE = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?("?[\w.]+"?)/gi
const RE_ALTER_TABLE = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?("?[\w.]+"?)([\s\S]*?);/gi
const RE_ADD_COLUMN = /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?("?\w+"?)/gi
const RE_DROP_COLUMN = /DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?("?\w+"?)/gi
const RE_RENAME_COLUMN = /RENAME\s+COLUMN\s+("?\w+"?)\s+TO\s+("?\w+"?)/gi

async function parseMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

  const tables = new Set()
  const columns = new Set() // "table.column"

  for (const file of files) {
    const sql = stripComments(await readFile(path.join(MIGRATIONS_DIR, file), 'utf8'))

    for (const m of sql.matchAll(RE_CREATE_TABLE)) tables.add(clean(m[1]))

    for (const m of sql.matchAll(RE_DROP_TABLE)) {
      const dropped = clean(m[1])
      tables.delete(dropped)
      for (const entry of [...columns]) {
        if (entry.startsWith(`${dropped}.`)) columns.delete(entry)
      }
    }

    for (const m of sql.matchAll(RE_ALTER_TABLE)) {
      const table = clean(m[1])
      const body = m[2]
      for (const c of body.matchAll(RE_ADD_COLUMN)) columns.add(`${table}.${clean(c[1])}`)
      for (const c of body.matchAll(RE_DROP_COLUMN)) columns.delete(`${table}.${clean(c[1])}`)
      for (const c of body.matchAll(RE_RENAME_COLUMN)) {
        columns.delete(`${table}.${clean(c[1])}`)
        columns.add(`${table}.${clean(c[2])}`)
      }
    }
  }

  // Columns added to a table this repo never creates (e.g. a Supabase-managed
  // schema) can't be probed meaningfully — keep only tables we know about.
  for (const entry of [...columns]) {
    if (!tables.has(entry.split('.')[0])) columns.delete(entry)
  }

  return { fileCount: files.length, tables, columns }
}

function probe(pathAndQuery) {
  return fetch(`${url}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
}

async function main() {
  const { fileCount, tables, columns } = await parseMigrations()

  const missingTables = []
  const missingColumns = []

  for (const table of [...tables].sort()) {
    const res = await probe(`${encodeURIComponent(table)}?limit=0`)
    if (res.status === 404) missingTables.push(table)
    else if (!res.ok && res.status !== 400) {
      console.warn(`check-schema-drift: unexpected ${res.status} probing table "${table}" — skipped.`)
    }
  }

  for (const entry of [...columns].sort()) {
    const [table, column] = entry.split('.')
    if (missingTables.includes(table)) continue // already reported at table level
    const res = await probe(`${encodeURIComponent(table)}?select=${encodeURIComponent(column)}&limit=0`)
    if (res.status === 400) missingColumns.push(entry)
    else if (!res.ok && res.status !== 404) {
      console.warn(`check-schema-drift: unexpected ${res.status} probing "${entry}" — skipped.`)
    }
  }

  const checked = `${tables.size} tables and ${columns.size} columns from ${fileCount} migration files`

  if (missingTables.length === 0 && missingColumns.length === 0) {
    console.log(`check-schema-drift: OK — ${checked} all present.`)
    return
  }

  console.error('check-schema-drift: FAILED — the database is behind the migrations in this repo.\n')
  if (missingTables.length) {
    console.error('Missing tables:')
    for (const t of missingTables) console.error(`  - ${t}`)
  }
  if (missingColumns.length) {
    console.error('Missing columns:')
    for (const c of missingColumns) console.error(`  - ${c}`)
  }
  console.error(`\nChecked ${checked}.`)
  console.error('Apply the outstanding migration(s) before deploying code that reads or writes these.')
  process.exit(1)
}

main().catch((err) => {
  console.error('check-schema-drift: crashed —', err)
  process.exit(2)
})
