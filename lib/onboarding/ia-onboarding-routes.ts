/**
 * Pure URL helpers for NEXT_PUBLIC_IA_ONBOARDING5 (unit-tested; no server-only imports).
 */

import type { HouseSystem, Tradition } from '@/types/blueprint'
import { TRADITION_HOUSE_DEFAULTS } from '@/types/blueprint'
import { iaOnboarding5FlagEnabled } from '@/lib/onboarding/ia-onboarding-flag'

export const DEFAULT_ONBOARDING_TRADITION: Tradition = 'evolutionary'

export function defaultOnboardingTraditionPayload(): {
  tradition: Tradition
  house_system: HouseSystem
} {
  const tradition = DEFAULT_ONBOARDING_TRADITION
  return {
    tradition,
    house_system: TRADITION_HOUSE_DEFAULTS[tradition],
  }
}

export const ONBOARDING_STEPS_IA5 = [
  { step: 1, path: '/onboarding', title: 'Timing Foundation' },
  { step: 2, path: '/onboarding/goals', title: 'Focus Layers' },
  { step: 3, path: '/onboarding/year-focus', title: 'Year and Energy' },
  { step: 4, path: '/onboarding/theme', title: 'Your Aesthetic' },
  { step: 5, path: '/onboarding/generating', title: 'Building' },
] as const

export const IA5_GENERATING_MODE_KEY = 'kiaros_ia5_generating_mode'

export const IA5_ONBOARDING_PATH_KEY = 'kiaros_ia5_onboarding_path'

export type Ia5GeneratingMode = 'blueprint' | 'week'

export type Ia5OnboardingPath = 'paid' | 'free'

/** Mirrors /api/onboarding/complete destination branching (no extra API). */
export function ia5OnboardingPathFromDestination(destination: string): Ia5OnboardingPath {
  return destination.includes('generating-week') ? 'free' : 'paid'
}

export function persistIa5OnboardingRoutingFromDestination(destination: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(IA5_ONBOARDING_PATH_KEY, ia5OnboardingPathFromDestination(destination))
  sessionStorage.setItem(
    IA5_GENERATING_MODE_KEY,
    destination.includes('generating-week') ? 'week' : 'blueprint',
  )
}

export function readIa5OnboardingPath(): Ia5OnboardingPath | null {
  if (typeof sessionStorage === 'undefined') return null
  const value = sessionStorage.getItem(IA5_ONBOARDING_PATH_KEY)
  return value === 'paid' || value === 'free' ? value : null
}

export function readIa5GeneratingMode(): Ia5GeneratingMode | null {
  if (typeof sessionStorage === 'undefined') return null
  const value = sessionStorage.getItem(IA5_GENERATING_MODE_KEY)
  return value === 'week' || value === 'blueprint' ? value : null
}

/** Old onboarding paths → canonical IA5 screen (307 targets). */
export const IA5_ONBOARDING_LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  '/onboarding/tradition': '/onboarding/goals',
  '/onboarding/study-focus': '/onboarding/year-focus',
  '/onboarding/cycle': '/onboarding/year-focus',
  '/onboarding/generating-week': '/onboarding/generating',
}

export function ia5LegacyOnboardingRedirect(pathname: string, flagOn: boolean): string | null {
  if (!flagOn) return null
  return IA5_ONBOARDING_LEGACY_REDIRECTS[pathname] ?? null
}

export function onboardingGeneratingHref(flagOn: boolean, apiDestination: string): string {
  if (!flagOn) return apiDestination
  if (apiDestination === '/onboarding/generating-week') {
    return '/onboarding/generating'
  }
  return apiDestination
}

export { iaOnboarding5FlagEnabled }
