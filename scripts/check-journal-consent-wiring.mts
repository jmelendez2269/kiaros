import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const routePath = new URL('../app/api/journal/route.ts', import.meta.url)
const todayPath = new URL('../app/(app)/today/actions.ts', import.meta.url)
const servicePath = new URL('../lib/journal/entry-service.ts', import.meta.url)

const [route, today, service] = await Promise.all([
  readFile(routePath, 'utf8'),
  readFile(todayPath, 'utf8'),
  readFile(servicePath, 'utf8'),
])

assert.match(route, /createJournalEntry\(\{/)
assert.match(today, /createJournalEntry\(\{/)
assert.doesNotMatch(route, /\.from\(['"]journal_entries['"]\)/)
assert.doesNotMatch(today, /\.from\(['"]journal_entries['"]\)/)
assert.match(today, /consent: privateJournalConsentInput\(\)/)
assert.match(service, /\.from\(['"]journal_entries['"]\)/)
assert.doesNotMatch(service, /console\.(?:log|error|warn)\([^\n]*(?:input\.body|body)/)

console.log('journal creation wiring checks passed')
