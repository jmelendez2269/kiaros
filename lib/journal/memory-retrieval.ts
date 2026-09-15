import 'server-only'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/supabase/admin'
export interface RecalledMemory { id: string; entry_date: string; title: string | null; body: string; mood_tag: null; is_ritual: false }
const rowSchema = z.object({ id: z.string().uuid(), entry_date: z.string(), title: z.string().nullable(), body: z.string(), score: z.number() })
export async function recallJournalMemories(userId: string, question: string): Promise<RecalledMemory[]> {
  if (!question.trim()) return []
  const { data, error } = await createAdminSupabase().rpc('recall_journal_memories', { p_user_id: userId, p_query: question.slice(0,1000) })
  if (error) throw new Error('Journal memory retrieval is temporarily unavailable')
  const rows = z.array(rowSchema).parse(data)
  let remaining = 4200
  const selected: RecalledMemory[] = []
  for (const row of rows) {
    if (row.score < 0.01 || remaining < 200 || selected.length >= 5) continue
    row.title = row.title?.slice(0,160) ?? null
    const body = row.body.slice(0, Math.min(850, remaining - (row.title?.length ?? 0) - 40))
    remaining -= body.length + (row.title?.length ?? 0) + 40
    selected.push({ id: row.id, entry_date: row.entry_date, title: row.title, body, mood_tag: null, is_ritual: false })
  }
  // Recheck permissions after ranking, before anything is returned to the prompt.
  if (!selected.length) return []
  const eligible = await createAdminSupabase().from('journal_entries').select('id').eq('user_id', userId).eq('include_in_stelloquy', true).in('id',selected.map(e=>e.id))
  if (eligible.error) throw new Error('Journal memory consent could not be verified')
  const allowed = new Set((eligible.data ?? []).map(e=>e.id))
  return selected.filter(e=>allowed.has(e.id))
}
