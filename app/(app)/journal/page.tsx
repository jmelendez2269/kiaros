import { createServerSupabase } from '@/lib/supabase/server'
import { JournalComposer } from '@/components/journal/JournalComposer'

export default async function JournalPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>
}) {
  const params = (await searchParams) ?? {}
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()

  const [entriesRes, oracleMemoryRes, journalEntriesRes, oracleCapturesRes, blueprintRes] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('id, title, body, entry_date, is_ritual, created_at, oracle_memory, lunar_phase, lunar_sign, transit_context')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('oracle_memory', true),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
    supabase
      .from('oracle_captures')
      .select('id, captured_text, source_role, include_in_insights, include_in_planner, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('blueprints')
      .select('plan_year')
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  function value(key: string) {
    const raw = params[key]
    return Array.isArray(raw) ? raw[0] : raw
  }

  const initialPrompt = value('prompt') ?? ''
  const initialArea = value('area') ?? ''
  const initialTheme = value('theme') ?? ''
  const initialWeek = value('week') ?? ''
  const initialStart = value('start') ?? ''
  const initialEnd = value('end') ?? ''
  const initialContext = value('context') ?? ''

  return (
    <JournalComposer
      initialPrompt={initialPrompt}
      initialArea={initialArea}
      initialTheme={initialTheme}
      initialWeek={initialWeek}
      initialStart={initialStart}
      initialEnd={initialEnd}
      initialContext={initialContext}
      journalEntriesCount={journalEntriesRes.error ? 0 : (journalEntriesRes.count ?? 0)}
      oracleMemoryCount={oracleMemoryRes.error ? 0 : (oracleMemoryRes.count ?? 0)}
      blueprintYear={blueprintRes.data?.plan_year ?? null}
      recentEntries={entriesRes.data ?? []}
      oracleCaptures={oracleCapturesRes.data ?? []}
    />
  )
}
