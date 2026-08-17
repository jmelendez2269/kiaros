import type { Tables } from '@/types/database'

export const ESTABLISHED_PATTERN_MIN_SAMPLE = 4
export const PATTERN_DISCOVERY_CHECK_EVENT = 'kairos:check-pattern-discoveries'

export type PatternDiscovery = Pick<
  Tables<'user_pattern_insights'>,
  | 'id'
  | 'pattern_type'
  | 'pattern_key'
  | 'sample_size'
  | 'summary'
  | 'ai_summary'
  | 'updated_at'
>

export function formatPatternLabel(patternType: string, patternKey: string): string {
  if (patternType === 'aspect') return patternKey.split(':').join(' ')
  if (patternType === 'lunar_phase') return `${patternKey} Moon`
  if (patternType === 'lunar_sign') return `Moon in ${patternKey}`
  if (patternType === 'retrograde') return `${patternKey} retrograde`
  return patternKey
}
