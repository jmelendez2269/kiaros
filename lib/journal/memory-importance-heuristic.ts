import {
  JOURNAL_MEMORY_IMPORTANCE_MAX,
  JOURNAL_MEMORY_IMPORTANCE_MIN,
} from '@/lib/journal/consent'

/**
 * Local-only importance estimate for Stelloquy recall ranking when the member
 * has never set importance manually (still null in storage).
 */
export function heuristicMemoryImportance(input: {
  body: string
  isRitual: boolean
}): number {
  const length = input.body.trim().length
  let score = 2
  if (length >= 400) score += 1
  if (length >= 1200) score += 1
  if (input.isRitual) score += 1
  return Math.min(JOURNAL_MEMORY_IMPORTANCE_MAX, Math.max(JOURNAL_MEMORY_IMPORTANCE_MIN, score))
}
