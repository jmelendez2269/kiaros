import { createServerSupabase } from '@/lib/supabase/server'

const LOOKBACK_DAYS = 90

/**
 * Returns the number of consecutive days ending today (or yesterday) on
 * which the user wrote at least one journal entry. A streak that ended
 * yesterday still counts — today's blank slate hasn't broken it yet.
 */
export async function getJournalStreak(today: string): Promise<number> {
  const supabase = await createServerSupabase()

  const start = new Date(`${today}T12:00:00`)
  start.setDate(start.getDate() - (LOOKBACK_DAYS - 1))
  const startIso = start.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date')
    .gte('entry_date', startIso)
    .lte('entry_date', today)
    .order('entry_date', { ascending: false })

  if (error || !data || data.length === 0) return 0

  const dayHas = new Set(data.map((row) => row.entry_date))

  // Anchor: today if written today, otherwise yesterday — preserves the
  // streak through the empty morning hours.
  const anchor = new Date(`${today}T12:00:00`)
  if (!dayHas.has(today)) anchor.setDate(anchor.getDate() - 1)

  let streak = 0
  const cursor = new Date(anchor)
  while (streak < LOOKBACK_DAYS) {
    const iso = cursor.toISOString().slice(0, 10)
    if (!dayHas.has(iso)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
