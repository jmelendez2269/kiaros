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

  function value(key: string) {
    const raw = params[key]
    return Array.isArray(raw) ? raw[0] : raw
  }

  const selectedEntryId = value('entry') ?? ''

  const [oracleMemoryRes, journalEntriesRes, blueprintRes, selectedEntryRes] = await Promise.all([
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('oracle_memory', true),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
    supabase
      .from('blueprints')
      .select('plan_year')
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    selectedEntryId
      ? supabase
          .from('journal_entries')
          .select('id, title, body, entry_date, is_ritual, oracle_memory')
          .eq('id', selectedEntryId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const initialPrompt = value('prompt') ?? ''
  const initialArea = value('area') ?? ''
  const initialTheme = value('theme') ?? ''
  const initialWeek = value('week') ?? ''
  const initialStart = value('start') ?? ''
  const initialEnd = value('end') ?? ''
  const initialContext = value('context') ?? ''

  return (
    <JournalComposer
      key={selectedEntryRes.data?.id ?? 'new-entry'}
      initialEntry={selectedEntryRes.data}
      entryLoadError={
        selectedEntryId && (selectedEntryRes.error || !selectedEntryRes.data)
          ? 'That journal entry could not be opened. It may no longer be available.'
          : null
      }
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
    />
  )
}
