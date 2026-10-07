import type { JournalConsentState } from '@/lib/journal/consent'
import { heuristicMemoryImportance } from '@/lib/journal/memory-importance-heuristic'

export function applyMemoryImportanceHeuristicIfNeeded(
  state: JournalConsentState,
  context: { body: string; isRitual: boolean; hadManualImportance: boolean },
): JournalConsentState {
  if (context.hadManualImportance || state.memory_importance !== null) {
    return state
  }
  return {
    ...state,
    memory_importance: heuristicMemoryImportance({
      body: context.body,
      isRitual: context.isRitual,
    }),
  }
}
