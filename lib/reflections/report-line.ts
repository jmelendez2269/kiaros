/**
 * The text a prepared reflection leads with, from a raw report row: its
 * opening when it was written from the member's records, else its sky
 * reading. null when it is prepared but has neither; undefined when the
 * report is not something to read yet (being prepared, failed, or out of date).
 */
export function reflectionLine(row: { status?: unknown; content?: unknown; analysis?: unknown }): string | null | undefined {
  if (row.status !== 'ready' && row.status !== 'empty') return undefined
  const text = (value: unknown, ...path: string[]): string | null => {
    let node = value
    for (const key of path) {
      if (!node || typeof node !== 'object') return null
      node = (node as Record<string, unknown>)[key]
    }
    return typeof node === 'string' && node.trim() ? node.trim() : null
  }
  const opening = text(row.content, 'opening', 'text')
  const sky = text(row.analysis, 'sky', 'sections', 'sky') ?? text(row.analysis, 'sky', 'sections', 'thread')
  if (row.status === 'ready') return opening ?? sky
  // "empty" with no sky reading is the old blank state: nothing to read.
  return sky ?? undefined
}
