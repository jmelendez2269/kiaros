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

/** URL path segments that should resolve to a canonical area slug (bookmarks / old slugify output). */
export const GOAL_CATEGORY_URL_SLUG_ALIASES: Readonly<Record<string, string>> = {
  money: 'financial',
  'work-and-career': 'work-career',
  'health-and-wellness': 'health-wellness',
}

/** Chip labels for onboarding (and LIFE_CATEGORIES). */
export const LIFE_CATEGORY_LABELS = GOAL_CATEGORY_SPECS.map((spec) => spec.label)

export function normalizeGoalCategoryKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
}

/** Legacy slug from DB category name (pre-canonical URLs). */
export function legacySlugifyGoalCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

/** Stable identity for dedupe (canonical slug when known). */
export function goalCategoryIdentityKey(name: string): string {
  const spec = findGoalCategorySpec(name)
  return spec?.slug ?? normalizeGoalCategoryKey(name)
}

export function goalCategoriesMatch(a: string, b: string): boolean {
  return goalCategoryIdentityKey(a) === goalCategoryIdentityKey(b)
}

/** Canonical `/areas/[slug]` segment for a category name. */
export function goalCategoryUrlSlugForName(name: string): string {
  const spec = findGoalCategorySpec(name)
  return spec?.slug ?? legacySlugifyGoalCategoryName(name)
}

/** Normalize a URL slug (aliases + canonical spec slugs). */
export function resolveGoalCategoryUrlSlug(urlSlug: string): string {
  const key = urlSlug.trim().toLowerCase()
  if (GOAL_CATEGORY_URL_SLUG_ALIASES[key]) {
    return GOAL_CATEGORY_URL_SLUG_ALIASES[key]
  }
  if (GOAL_CATEGORY_SPECS.some((spec) => spec.slug === key)) {
    return key
  }
  return key
}

export function findGoalCategoryRowByUrlSlug<T extends { name: string }>(
  rows: readonly T[],
  urlSlug: string,
): T | undefined {
  const canonical = resolveGoalCategoryUrlSlug(urlSlug)
  return rows.find((row) => goalCategoryUrlSlugForName(row.name) === canonical)
}

export type GoalCategoryLike = { name: string; success?: string; description?: string }

/** Merge legacy + new labels; prefer current display label for storage. */
export function dedupeGoalCategories<T extends GoalCategoryLike>(categories: T[]): T[] {
  const result: T[] = []
  for (const entry of categories) {
    const label = resolveGoalCategoryLabel(entry.name)
    if (result.some((row) => goalCategoriesMatch(row.name, label))) {
      continue
    }
    result.push({ ...entry, name: label })
  }
  return result
}
