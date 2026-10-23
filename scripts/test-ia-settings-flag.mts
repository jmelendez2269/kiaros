/**
 * NEXT_PUBLIC_IA_SETTINGS — Settings regroup layout and flag wiring.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIaSettingsEnabled } from '../lib/ia-settings-flag.ts'
import {
  iaSettingsFlagEnabled,
  MOON_DAY_NUDGE_REMINDER_SETTINGS_LABEL,
  scrollSettingsAnchorIntoView,
  SETTINGS_IA_SCROLL_OFFSET_PX,
  SETTINGS_IA_STICKY_BAR_MOBILE_BOTTOM_CLASS,
  settingsBirthDataHref,
  settingsMoonReminderHref,
  SETTINGS_IA_GROUPS,
} from '../lib/settings/ia-settings-routes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { featureFlagEnabled } = require('../lib/calendar/feature-flag-enabled.cjs')

console.log('=== NEXT_PUBLIC_IA_SETTINGS tests ===\n')

console.log('Flag env parsing (parity with CJS helper)')
for (const sample of [undefined, '', 'false', 'TRUE', ' on ', 'yes', '1']) {
  if (sample === undefined) {
    delete process.env.NEXT_PUBLIC_IA_SETTINGS
  } else {
    process.env.NEXT_PUBLIC_IA_SETTINGS = sample
  }
  assert.equal(isIaSettingsEnabled(), featureFlagEnabled(sample))
  assert.equal(iaSettingsFlagEnabled(sample), featureFlagEnabled(sample))
}
delete process.env.NEXT_PUBLIC_IA_SETTINGS
assert.equal(isIaSettingsEnabled(), false)
console.log('✓ Flag parsing\n')

console.log('Route helpers')
assert.equal(settingsBirthDataHref(false), '/settings')
assert.equal(settingsBirthDataHref(true), '/settings#birth-data')
assert.equal(settingsMoonReminderHref(true), '/settings#moon-reminder')
assert.equal(SETTINGS_IA_GROUPS.length, 7)
assert.equal(SETTINGS_IA_GROUPS[0].id, 'birth-data')
console.log('✓ Route helpers\n')

console.log('feature-flags.ts exports isIaSettingsEnabled')
const flagsSource = readFileSync(join(root, 'lib/feature-flags.ts'), 'utf8')
const flagModuleSource = readFileSync(join(root, 'lib/ia-settings-flag.ts'), 'utf8')
assert.ok(flagModuleSource.includes('NEXT_PUBLIC_IA_SETTINGS'))
assert.ok(flagsSource.includes('isIaSettingsEnabled'))
console.log('✓ Server flag export\n')

console.log('Settings page switches on flag')
const pageSource = readFileSync(join(root, 'app/(app)/settings/page.tsx'), 'utf8')
assert.ok(pageSource.includes('isIaSettingsEnabled'))
assert.ok(pageSource.includes('SettingsPageLegacy'))
assert.ok(pageSource.includes('SettingsPageIa'))
console.log('✓ Page switch\n')

console.log('Scroll offset helper')
assert.equal(SETTINGS_IA_SCROLL_OFFSET_PX, 24)
assert.ok(typeof scrollSettingsAnchorIntoView === 'function')
console.log('✓ Scroll helper\n')

console.log('IA settings layout anchors and sticky save bar')
const iaSource = readFileSync(join(root, 'components/settings/SettingsPageIa.tsx'), 'utf8')
for (const id of ['birth-data', 'chart', 'year', 'look', 'journal', 'plan', 'shortcuts']) {
  assert.ok(iaSource.includes(`id="${id}"`), `missing section #${id}`)
}
assert.ok(iaSource.includes('Unsaved changes'))
assert.ok(iaSource.includes('moon-reminder'))
assert.ok(iaSource.includes('insight-voice') || iaSource.includes('VoicePanel'))
assert.ok(iaSource.includes('scrollSettingsAnchorIntoView'))
assert.ok(iaSource.includes('scroll-mt-6'), 'sections use 24px scroll margin')
assert.ok(iaSource.includes('aria-current={isActive ? "true" : undefined}'))
assert.ok(
  iaSource.includes('disabled={form.birth_time_unknown}'),
  'birth time must disable when unknown time is checked',
)
assert.ok(iaSource.includes('SETTINGS_IA_STICKY_BAR_MOBILE_BOTTOM_CLASS'))
assert.equal(SETTINGS_IA_STICKY_BAR_MOBILE_BOTTOM_CLASS, 'max-md:bottom-[5rem]')
assert.ok(iaSource.includes('text-bone-muted">Saved</p>'), 'Saved confirmation beside save in sticky bar')
const shortcutsSection = iaSource.match(/id="shortcuts"[\s\S]*?<\/section>/)?.[0] ?? ''
assert.ok(
  !shortcutsSection.includes('text-bone-muted">Saved</p>'),
  'Saved must not appear in Shortcuts section',
)
console.log('✓ IA layout\n')

console.log('Moon-day nudge reminder settings link (flag-gated)')
const nudgeSource = readFileSync(join(root, 'components/today/MoonDayRitualNudge.tsx'), 'utf8')
assert.ok(nudgeSource.includes('settingsMoonReminderHref'))
assert.ok(nudgeSource.includes('isIaSettingsEnabled'))
assert.equal(MOON_DAY_NUDGE_REMINDER_SETTINGS_LABEL, 'Reminder settings')
assert.ok(nudgeSource.includes('MOON_DAY_NUDGE_REMINDER_SETTINGS_LABEL'))
assert.ok(nudgeSource.includes('iaSettingsOn'), 'link only when IA settings flag on')
console.log('✓ Moon-day nudge link\n')

console.log('Self chapters deep-link birth data when flag on')
const designSource = readFileSync(join(root, 'components/self/chapters/DesignChapter.tsx'), 'utf8')
const housesSource = readFileSync(join(root, 'components/self/chapters/HousesChapter.tsx'), 'utf8')
assert.ok(designSource.includes('settingsBirthDataHref'))
assert.ok(housesSource.includes('settingsBirthDataHref'))
console.log('✓ Birth-data deep links\n')

console.log('Legacy settings unchanged export')
const legacySource = readFileSync(join(root, 'components/settings/SettingsPageLegacy.tsx'), 'utf8')
assert.ok(legacySource.includes('SettingsPageLegacy'))
assert.ok(legacySource.includes('Save settings'))
console.log('✓ Legacy page\n')

console.log('All IA settings flag tests passed.')
