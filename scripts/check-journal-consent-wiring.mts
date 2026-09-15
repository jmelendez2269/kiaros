import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const routePath = new URL('../app/api/journal/route.ts', import.meta.url)
const todayPath = new URL('../app/(app)/today/actions.ts', import.meta.url)
const servicePath = new URL('../lib/journal/entry-service.ts', import.meta.url)
const consentRoutePath = new URL('../app/api/journal/[id]/consent/route.ts', import.meta.url)
const composerPath = new URL('../components/journal/JournalComposer.tsx', import.meta.url)
const controlsPath = new URL('../components/journal/JournalConsentControls.tsx', import.meta.url)
const historyPath = new URL('../components/insights/JournalHistoryList.tsx', import.meta.url)

const [route, today, service, consentRoute, composer, controls, history] = await Promise.all([
  readFile(routePath, 'utf8'),
  readFile(todayPath, 'utf8'),
  readFile(servicePath, 'utf8'),
  readFile(consentRoutePath, 'utf8'),
  readFile(composerPath, 'utf8'),
  readFile(controlsPath, 'utf8'),
  readFile(historyPath, 'utf8'),
])

assert.match(route, /createJournalEntry\(\{/)
assert.match(today, /createJournalEntry\(\{/)
assert.doesNotMatch(route, /\.from\(['"]journal_entries['"]\)/)
assert.doesNotMatch(today, /\.from\(['"]journal_entries['"]\)/)
assert.match(today, /consent: privateJournalConsentInput\(\)/)
assert.match(service, /\.from\(['"]journal_entries['"]\)/)
assert.doesNotMatch(service, /console\.(?:log|error|warn)\([^\n]*(?:input\.body|body)/)
assert.match(consentRoute, /isJournalConsentV2Enabled\(\)/)
assert.match(consentRoute, /journalConsentStateSchema\.safeParse/)
assert.match(consentRoute, /oracle_memory: consent\.include_in_stelloquy/)
assert.match(consentRoute, /\.eq\(['"]id['"], id\)/)
assert.doesNotMatch(consentRoute, /error\.message/)
assert.doesNotMatch(consentRoute, /requireActivePlannerAccess/)
assert.match(composer, /consentV2Enabled/)
assert.match(composer, /\.\.\.consent, oracle_memory: consent\.include_in_stelloquy/)
assert.match(controls, /Include in Patterns/)
assert.match(controls, /Let Stelloquy recall it/)
assert.match(history, /method: ['"]PATCH['"]/)
assert.match(history, /Change permissions/)

console.log('journal creation wiring checks passed')
