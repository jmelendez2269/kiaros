import { createServerSupabase } from '@/lib/supabase/server'
import { JournalComposer } from '@/components/journal/JournalComposer'

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const supabase = await createServerSupabase()

  const { data: entries } = await supabase
    .from('journal_entries')
    .select('id, title, body, entry_date, is_ritual, created_at')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6)

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
      recentEntries={entries ?? []}
    />
  )
}
