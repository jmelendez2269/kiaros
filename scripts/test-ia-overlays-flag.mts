/**
 * NEXT_PUBLIC_IA_OVERLAYS — Stelloquy tab, notice area, feedback help menu.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIaOverlaysEnabled } from '../lib/ia-overlays-flag.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { featureFlagEnabled } = require('../lib/calendar/feature-flag-enabled.cjs')

console.log('=== NEXT_PUBLIC_IA_OVERLAYS tests ===\n')

console.log('Flag env parsing (parity with next.config CJS helper)')
for (const sample of [undefined, '', 'false', 'TRUE', ' on ', 'yes', '1']) {
  if (sample === undefined) {
    delete process.env.NEXT_PUBLIC_IA_OVERLAYS
  } else {
    process.env.NEXT_PUBLIC_IA_OVERLAYS = sample
  }
  assert.equal(isIaOverlaysEnabled(), featureFlagEnabled(sample))
}
delete process.env.NEXT_PUBLIC_IA_OVERLAYS
assert.equal(isIaOverlaysEnabled(), false)
console.log('✓ Flag parsing\n')

console.log('next.config /oracle redirect only when flag off')
const nextConfigSource = readFileSync(join(root, 'next.config.js'), 'utf8')
assert.ok(nextConfigSource.includes('NEXT_PUBLIC_IA_OVERLAYS'))
assert.ok(nextConfigSource.includes('iaOverlaysOn'))
assert.ok(nextConfigSource.includes('!iaOverlaysOn'))
assert.ok(nextConfigSource.includes("source: '/oracle'"))
assert.ok(nextConfigSource.includes("destination: '/today'"))
console.log('✓ next.config oracle redirect wiring\n')

console.log('Shared conversation provider when flag on')
const providerSource = readFileSync(join(root, 'components/oracle/StelloquyProvider.tsx'), 'utf8')
assert.ok(providerSource.includes('sharedConversationEnabled'))
assert.ok(providerSource.includes('StelloquySharedChatProvider'))
const layoutSource = readFileSync(join(root, 'app/(app)/layout.tsx'), 'utf8')
assert.ok(layoutSource.includes('isIaOverlaysEnabled'))
assert.ok(layoutSource.includes('sharedConversationEnabled={iaOverlaysEnabled}'))
const shellSource = readFileSync(join(root, 'components/oracle/StelloquyShell.tsx'), 'utf8')
assert.ok(shellSource.includes('useSharedChat={sharedConversation}'))
const chatSource = readFileSync(join(root, 'components/oracle/OracleChat.tsx'), 'utf8')
assert.ok(chatSource.includes('useSharedChat={sharedConversation && t.id === defaultTab}'))
console.log('✓ Drawer + page shared thread wiring\n')

console.log('Notice area outside Today main column')
assert.ok(layoutSource.includes('!iaOverlaysEnabled ? <ReflectionNotification />'))
const sidebarSource = readFileSync(join(root, 'components/almanac/AlmanacSidebar.tsx'), 'utf8')
assert.ok(sidebarSource.includes('IaOverlaysNoticeStack'))
assert.ok(sidebarSource.includes('iaOverlaysEnabled'))
assert.ok(sidebarSource.includes('data-testid="app-notice-area"') || readFileSync(join(root, 'components/overlays/AppNoticeArea.tsx'), 'utf8').includes('data-testid="app-notice-area"'))
assert.ok(!layoutSource.includes('<ReflectionNotification />') || layoutSource.includes('!iaOverlaysEnabled'))
const todaySource = readFileSync(join(root, 'app/(app)/today/page.tsx'), 'utf8')
assert.ok(!todaySource.includes('IaOverlaysNoticeStack'))
assert.ok(!todaySource.includes('AppNoticeArea'))
console.log('✓ Notice stack in shell / sidebar only\n')

console.log('Feedback: floating when flag off, help menu when flag on')
assert.ok(layoutSource.includes('!iaOverlaysEnabled ? <FeedbackButton />'))
assert.ok(sidebarSource.includes('AppHelpMenu'))
console.log('✓ Feedback placement\n')

console.log('Stelloquy nav star glyph preserved')
assert.ok(sidebarSource.includes("glyph: '✦'"))
console.log('✓ Stelloquy ✦ glyph\n')

console.log('feature-flags.ts exports isIaOverlaysEnabled')
const flagsSource = readFileSync(join(root, 'lib/feature-flags.ts'), 'utf8')
assert.ok(flagsSource.includes('isIaOverlaysEnabled'))
const overlaysFlagSource = readFileSync(join(root, 'lib/ia-overlays-flag.ts'), 'utf8')
assert.ok(overlaysFlagSource.includes('NEXT_PUBLIC_IA_OVERLAYS'))
console.log('✓ Server feature flag export\n')

console.log('All NEXT_PUBLIC_IA_OVERLAYS tests passed.')
