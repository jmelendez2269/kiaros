'use server'

import { revalidatePath } from 'next/cache'
import { privateJournalConsentInput } from '@/lib/journal/consent'
import { createJournalEntry } from '@/lib/journal/entry-service'

const MIN_BODY_LEN = 1
const MAX_BODY_LEN = 4000
const MAX_TAGS = 6
const MAX_TAG_LEN = 32

export type SaveLineResult =
  | { ok: true; entryId: string }
  | { ok: false; error: string }

/** Server action for Today's private quick-line composer. */
export async function saveLineForToday(
  rawBody: string,
  tags: string[],
): Promise<SaveLineResult> {
  const body = rawBody.trim()
  if (body.length < MIN_BODY_LEN) return { ok: false, error: 'Write at least a sentence.' }
  if (body.length > MAX_BODY_LEN) {
    return { ok: false, error: 'That line is longer than the daily composer supports.' }
  }

  const normalizedTags = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LEN),
    ),
  ).slice(0, MAX_TAGS)

  const entryDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const result = await createJournalEntry({
    title: null,
    body,
    entryDate,
    isRitual: false,
    transitContext:
      normalizedTags.length > 0 ? { context: `tags: ${normalizedTags.join(', ')}` } : null,
    consent: privateJournalConsentInput(),
    source: 'today_quick_entry',
  })

  if (!result.success) {
    const error =
      result.code === 'entry_write_failed'
        ? 'Could not save that line.'
        : 'Could not load your profile.'
    return { ok: false, error }
  }

  revalidatePath('/today')
  return { ok: true, entryId: result.data.id }
}
