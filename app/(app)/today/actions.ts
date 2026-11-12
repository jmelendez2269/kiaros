'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createJournalEntry } from '@/lib/journal/entry-service'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import { saveCheckIn } from '@/lib/today/check-in'
import { parseCheckIn, type CheckIn } from '@/lib/today/check-in-options'

const MIN_BODY_LEN = 1
const MAX_BODY_LEN = 4000
const MAX_TAGS = 6
const MAX_TAG_LEN = 32

export type SaveLineResult =
  | { ok: true; entryId: string }
  | { ok: false; error: string }

/** Server action for Today's quick-line composer. */
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
    // No explicit consent: the entry starts with the user's journal defaults
    // (included unless they chose "choose each").
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
  revalidatePath('/insights')
  return { ok: true, entryId: result.data.id }
}

export type SaveCheckInResult = { ok: true; checkIn: CheckIn } | { ok: false; error: string }

/** Server action for Today's check-in: an energy level and a mood word, either of which may be cleared. */
export async function saveTodayCheckIn(input: { energy: number | null; mood: string | null }): Promise<SaveCheckInResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: 'Please sign in again.' }
  const checkIn = parseCheckIn(input)
  if (!checkIn) return { ok: false, error: 'That check-in could not be read.' }
  if (await requireActivePlannerAccess(userId)) return { ok: false, error: 'Check-ins need an active planner.' }

  const result = await saveCheckIn(checkIn)
  if (!result.success) return { ok: false, error: result.error }
  revalidatePath('/today')
  revalidatePath('/insights')
  return { ok: true, checkIn: result.data }
}
