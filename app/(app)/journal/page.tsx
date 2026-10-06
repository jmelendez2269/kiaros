import { createServerSupabase } from '@/lib/supabase/server'
import { JournalComposer } from '@/components/journal/JournalComposer'
import { memberHasOracleAccess } from '@/lib/commerce/member-oracle-access'
import type { ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { isJournalConsentV2Enabled, isMemoryDefaultsEnabled } from '@/lib/feature-flags'
import { loadJournalMemorySettings } from '@/lib/journal/load-memory-settings'
import { resolveNewEntryConsent } from '@/lib/journal/memory-defaults'
import type { JournalConsentState } from '@/lib/journal/consent'
import { auth } from '@clerk/nextjs/server'

export default async function JournalPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>
}) {
  const params = (await searchParams) ?? {}
  const supabase = await createServerSupabase()
  const { userId } = await auth()
  const currentYear = new Date().getFullYear()
  const consentV2Enabled = isJournalConsentV2Enabled()
  const memoryDefaultsEnabled = isMemoryDefaultsEnabled() && consentV2Enabled

  function value(key: string) {
    const raw = params[key]
    return Array.isArray(raw) ? raw[0] : raw
  }

  const selectedEntryId = value('entry') ?? ''

  const [oracleMemoryRes, journalEntriesRes, profileRes, selectedEntryRes] = await Promise.all([
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('include_in_stelloquy', true),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
    supabase
      .from('user_profiles')
      .select('id, plan_year')
      .maybeSingle(),
    selectedEntryId
      ? supabase
          .from('journal_entries')
          .select(
            'id, title, body, entry_date, is_ritual, oracle_memory, include_in_insights, include_in_stelloquy, memory_pinned, memory_importance',
          )
          .eq('id', selectedEntryId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  let showMemoryPrompt = false
  let initialNewEntryConsent: JournalConsentState | undefined
  let hasOracleAccess = false

  if (memoryDefaultsEnabled && profileRes.data?.id && userId) {
    const memorySettings = await loadJournalMemorySettings(supabase, profileRes.data.id)
    showMemoryPrompt = memorySettings.memory_mode_prompted_at === null

    const { data: entitlements } = await supabase
      .from('product_entitlements')
      .select('*')
      .eq('user_id', profileRes.data.id)
    hasOracleAccess = await memberHasOracleAccess(
      profileRes.data.id,
      (entitlements ?? []) as ProductEntitlementRecord[],
    )
    initialNewEntryConsent = resolveNewEntryConsent(memorySettings, hasOracleAccess, undefined)
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
      blueprintYear={profileRes.data?.plan_year === currentYear ? currentYear : null}
      consentV2Enabled={consentV2Enabled}
      memoryDefaultsEnabled={memoryDefaultsEnabled}
      showMemoryPrompt={showMemoryPrompt}
      initialNewEntryConsent={initialNewEntryConsent}
      hasOracleAccess={hasOracleAccess}
    />
  )
}
