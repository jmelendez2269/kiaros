import assert from 'node:assert/strict'
import { getAreaDefinition } from '../lib/areas.ts'
import {
  dedupeGoalCategories,
  findGoalCategoryRowByUrlSlug,
  findGoalCategorySpec,
  goalCategoriesMatch,
  goalCategoryUrlSlugForName,
  resolveGoalCategoryUrlSlug,
} from '../lib/goal-categories.ts'

console.log('=== goal categories (Stella renames) ===\n')

const renamed: { legacyName: string; label: string; canonicalSlug: string; legacyUrlSlug: string }[] = [
  { legacyName: 'Financial', label: 'Money', canonicalSlug: 'financial', legacyUrlSlug: 'financial' },
  { legacyName: 'Work & Career', label: 'Work and career', canonicalSlug: 'work-career', legacyUrlSlug: 'work-and-career' },
  { legacyName: 'Health & Wellness', label: 'Health and wellness', canonicalSlug: 'health-wellness', legacyUrlSlug: 'health-and-wellness' },
  { legacyName: 'Creative Projects', label: 'Creative projects', canonicalSlug: 'creative-projects', legacyUrlSlug: 'creative-projects' },
  { legacyName: 'Personal Growth', label: 'Personal growth', canonicalSlug: 'personal-growth', legacyUrlSlug: 'personal-growth' },
]

for (const row of renamed) {
  const specFromLegacy = findGoalCategorySpec(row.legacyName)
  assert.ok(specFromLegacy, `legacy name resolves: ${row.legacyName}`)
  assert.equal(specFromLegacy!.slug, row.canonicalSlug)

  const specFromLabel = findGoalCategorySpec(row.label)
  assert.ok(specFromLabel, `label resolves: ${row.label}`)
  assert.equal(specFromLabel!.slug, row.canonicalSlug)

  const areaFromLegacy = getAreaDefinition(row.legacyName)
  const areaFromLabel = getAreaDefinition(row.label)
  assert.equal(areaFromLegacy.slug, row.canonicalSlug)
  assert.equal(areaFromLabel.slug, row.canonicalSlug)
  assert.equal(areaFromLegacy.slug, areaFromLabel.slug)

  assert.equal(goalCategoryUrlSlugForName(row.legacyName), row.canonicalSlug)
  assert.equal(goalCategoryUrlSlugForName(row.label), row.canonicalSlug)

  const rows = [{ name: row.legacyName }]
  assert.ok(findGoalCategoryRowByUrlSlug(rows, row.legacyUrlSlug), `legacy URL /areas/${row.legacyUrlSlug}`)
  assert.ok(findGoalCategoryRowByUrlSlug(rows, row.canonicalSlug), `canonical URL /areas/${row.canonicalSlug}`)

  if (row.label === 'Money') {
    assert.equal(resolveGoalCategoryUrlSlug('money'), 'financial')
    assert.ok(findGoalCategoryRowByUrlSlug([{ name: row.label }], 'money'), 'alias URL /areas/money')
  }

  console.log(`✓ ${row.legacyName} / ${row.label} → slug ${row.canonicalSlug}`)
}

assert.ok(goalCategoriesMatch('Work & Career', 'Work and career'))
const deduped = dedupeGoalCategories([
  { name: 'Work & Career', success: 'a' },
  { name: 'Work and career', success: 'b' },
  { name: 'Financial', success: '' },
  { name: 'Money', success: '' },
])
assert.equal(deduped.length, 2)
assert.equal(deduped[0].name, 'Work and career')
assert.equal(deduped[1].name, 'Money')
console.log('✓ dedupe legacy + new labels')

console.log('\nAll goal category tests passed.\n')
