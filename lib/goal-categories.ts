/**
 * Onboarding goal category labels (display) and legacy persisted names.
 * goal_categories.name is stored verbatim from onboarding; blueprint matching uses normalizeGoalCategoryKey.
 */

export type GoalCategorySpec = {
  slug: string
  label: string
  legacyNames: readonly string[]
}

export const GOAL_CATEGORY_SPECS: readonly GoalCategorySpec[] = [
  { slug: 'work-career', label: 'Work and career', legacyNames: ['Work & Career'] },
  { slug: 'relationships', label: 'Relationships', legacyNames: [] },
  { slug: 'health-wellness', label: 'Health and wellness', legacyNames: ['Health & Wellness'] },
  { slug: 'creative-projects', label: 'Creative projects', legacyNames: ['Creative Projects'] },
  { slug: 'personal-growth', label: 'Personal growth', legacyNames: ['Personal Growth'] },
  { slug: 'family', label: 'Family', legacyNames: [] },
  { slug: 'financial', label: 'Money', legacyNames: ['Financial'] },
  { slug: 'spirituality', label: 'Spirituality', legacyNames: [] },
]

/** Chip labels for onboarding (and LIFE_CATEGORIES). */
export const LIFE_CATEGORY_LABELS = GOAL_CATEGORY_SPECS.map((spec) => spec.label)

export function normalizeGoalCategoryKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
}

function matchesSpec(spec: GoalCategorySpec, nameOrSlug: string): boolean {
  const key = normalizeGoalCategoryKey(nameOrSlug)
  if (normalizeGoalCategoryKey(spec.label) === key) return true
  if (spec.slug === nameOrSlug.trim().toLowerCase()) return true
  return spec.legacyNames.some((legacy) => normalizeGoalCategoryKey(legacy) === key)
}

/** Resolve persisted or legacy category text to the current display label. */
export function resolveGoalCategoryLabel(name: string): string {
  const spec = GOAL_CATEGORY_SPECS.find((entry) => matchesSpec(entry, name))
  return spec?.label ?? name
}

export function findGoalCategorySpec(nameOrSlug: string): GoalCategorySpec | undefined {
  return GOAL_CATEGORY_SPECS.find((entry) => matchesSpec(entry, nameOrSlug))
}
