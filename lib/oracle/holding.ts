/**
 * What a Stelloquy conversation is holding, as the side panel names it.
 * Pure: no server imports. Run tests: npx tsx --test lib/oracle/__tests__/holding.test.ts
 */

/** Themes that come up in the most saved conversations, most first. Names only. */
export function topThemes(topics: Array<{ capture_id: string; kind: string; label: string }>, limit = 3): string[] {
  const byLabel = new Map<string, Set<string>>()
  for (const topic of topics) {
    if (topic.kind !== 'theme') continue
    const ids = byLabel.get(topic.label) ?? new Set<string>()
    ids.add(topic.capture_id)
    byLabel.set(topic.label, ids)
  }
  return [...byLabel.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label)
}

export const rememberedEntriesLine = (n: number) =>
  n === 0 ? 'No journal entries you have allowed it to remember yet' : `${n} journal ${n === 1 ? 'entry' : 'entries'} you allowed it to remember`
