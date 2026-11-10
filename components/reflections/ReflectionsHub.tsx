'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Feedback, Intention, Preferences, SavedReport } from '@/lib/reflections/report-schema'
import { addDays, latestClosed, localDate, periodFor, periodLabel, weekOf, type PeriodKind } from '@/lib/reflections/periods'
import { reflectionShareCard } from '@/lib/reflections/share-card'
import { ConsentEmptyState } from '@/components/insights/ConsentEmptyState'
import { REFLECTIONS_SEEN_EVENT } from '@/lib/reflections/notification'
import { SkyReadingView } from '@/components/reflections/SkyReading'
import { UnwrappedStory } from '@/components/reflections/UnwrappedStory'
import { buildStoryFrames } from '@/lib/reflections/story'
import { LookBackPreview } from '@/components/period-review/LookBackPreview'
import type { PeriodReviewSourceChips } from '@/lib/period-review/report-schema'
type State = { settings: Preferences; reports: SavedReport[]; feedback: Feedback[]; intentions: Intention[]; consentV2Enabled: boolean; includedEntriesCount: number; memberSince?: string | null }
type Passage = { text: string; sources: string[] }
type Payload = Record<string, unknown>
type CardState = 'ready' | 'empty' | 'stale' | 'failed' | 'generating' | 'available' | 'open' | 'future'
type PeriodCard = { key: string; label: string; year: number; index: number; start: string; end: string; state: CardState; report?: SavedReport }
const inputClass = 'w-full rounded-lg border border-white/20 bg-transparent p-3 text-bone focus:outline-none focus:ring-2 focus:ring-amber-200/60'
const buttonClass = 'rounded-lg border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'
const pillClass = 'rounded-full border border-white/15 px-3 py-1 text-xs transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const linkButtonClass = 'text-sm underline underline-offset-4 hover:text-amber-100 disabled:opacity-50'
const monthName = (i: number, style: 'long' | 'short' = 'long') => new Intl.DateTimeFormat('en-US', { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, i - 1, 1)))
const dayLabel = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'))
function lastDay(end: string) { const d = new Date(end + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) }
const CARD_COPY: Record<CardState, string> = {
  ready: 'Ready to read', empty: 'Not much recorded', stale: 'New entries · refresh', failed: 'Couldn’t finish · try again',
  generating: 'Being prepared…', available: 'Ready to prepare', open: '', future: 'Not yet',
}
/** Weeks (Monday to Sunday) whose Monday falls in the given month. */
function weekSlots(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  let monday = addDays(first, (8 - new Date(first + 'T00:00:00Z').getUTCDay()) % 7)
  const slots: { year: number; index: number; label: string }[] = []
  while (monday.slice(0, 7) === first.slice(0, 7)) {
    slots.push({ ...weekOf(monday), label: `${dayLabel(monday)} – ${dayLabel(addDays(monday, 6))}` })
    monday = addDays(monday, 7)
  }
  return slots
}
function buildCards(kind: PeriodKind, year: number, month: number, timezone: string, reports: SavedReport[], today: string, since: string | null): PeriodCard[] {
  const thisYear = Number(today.slice(0, 4))
  const firstYear = since ? Number(since.slice(0, 4)) : thisYear - 2
  const slots: { year: number; index: number; label: string }[] = kind === 'week' ? weekSlots(year, month) : kind === 'year'
    ? Array.from({ length: thisYear - Math.min(firstYear, ...reports.filter(r => r.kind === 'year').map(r => Number(r.period_start.slice(0, 4)))) + 1 }, (_, i) => {
        const y = thisYear - i
        return { year: y, index: 1, label: String(y) }
      })
    : Array.from({ length: kind === 'month' ? 12 : 4 }, (_, i) => ({ year, index: i + 1, label: kind === 'month' ? monthName(i + 1) : `Q${i + 1}` }))
  return slots.map(slot => {
    const p = periodFor(kind, slot.year, slot.index, timezone)
    const report = reports.find(r => r.kind === kind && r.period_start === p.start)
    const state: CardState = p.start > today ? 'future' : p.end > today ? 'open' : report ? report.status : 'available'
    return { key: p.start, label: slot.label, year: slot.year, index: slot.index, start: p.start, end: p.end, state, report }
  })
    // Nothing from before the member's subscription began, unless a reflection already exists for it.
    .filter(card => !since || card.end > since || !!card.report)
}
export function ReflectionsHub({
  initialKind = 'month',
  initialStart,
  journalIaEmbed = false,
}: {
  initialKind?: PeriodKind
  /** First day (YYYY-MM-DD) of a period to open on, e.g. from a week on the Reviews page. */
  initialStart?: string
  journalIaEmbed?: boolean
}) {
  const [data, setData] = useState<State | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [pendingStart, setPendingStart] = useState<string | null>(null)
  const [kind, setKind] = useState<PeriodKind>(initialKind), [year, setYear] = useState(new Date().getFullYear()), [month, setMonth] = useState(new Date().getMonth() + 1)
  const [selectedId, setSelectedId] = useState<string | null>(null), [prefsOpen, setPrefsOpen] = useState(false)
  const [timezone, setTimezone] = useState(''), [automatic, setAutomatic] = useState(false), [includeGoals, setIncludeGoals] = useState(true)
  const [shareText, setShareText] = useState(''), [shareOpen, setShareOpen] = useState(false)
  const [focusStart, setFocusStart] = useState<string | null>(null), [preview, setPreview] = useState<PeriodReviewSourceChips | null>(null)
  const load = useCallback(async (initialize = false) => {
    const response = await fetch('/api/reflections', { cache: 'no-store' })
    if (response.redirected) throw new Error('Please sign in again to view your reflections.')
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Reflections could not be loaded')
    const state = result as State
    setData(state)
    if (initialize) {
      const tz = state.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(tz); setAutomatic(state.settings.automatic); setIncludeGoals(state.settings.include_goals)
      // Open on the latest ended period, or the member's first month when that came before they joined.
      const closed = latestClosed(initialKind, tz).start, latest = state.memberSince && state.memberSince.slice(0, 7) > closed.slice(0, 7) ? state.memberSince : closed
      setYear(Number(latest.slice(0, 4))); setMonth(Number(latest.slice(5, 7)))
      if (initialStart) {
        // Open on the asked-for period: its reflection when there is one, else the offer to prepare it.
        setYear(Number(initialStart.slice(0, 4))); setMonth(Number(initialStart.slice(5, 7)))
        const match = state.reports.find(r => r.kind === initialKind && r.period_start === initialStart)
        if (match) setSelectedId(match.id); else setFocusStart(initialStart)
      }
    }
  }, [initialKind, initialStart])
  useEffect(() => { load(true).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [load])
  // Being here is looking: clear the "new reflection" notice, on screen and for next time.
  useEffect(() => {
    window.dispatchEvent(new Event(REFLECTIONS_SEEN_EVENT))
    void fetch('/api/reflections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seen' }) }).catch(() => {})
  }, [])
  // Refresh on return to the page so consent changes elsewhere cannot leave an old report on screen.
  useEffect(() => {
    const refresh = () => { if (!document.hidden) { setData(null); load().catch(e => setError(e.message)) } }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [load])
  async function action(payloads: Payload | Payload[], message: string): Promise<boolean> {
    setBusy(true); setError(''); setNotice('')
    try {
      let id: string | undefined
      for (const payload of Array.isArray(payloads) ? payloads : [payloads]) {
        const response = await fetch('/api/reflections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Please try again')
        if (result.id) id = result.id
      }
      setData(null); await load()
      if (id) setSelectedId(id)
      setNotice(message)
      return true
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again'); return false }
    finally { setBusy(false); setPendingStart(null) }
  }
  // Never the half-typed preferences field: an invalid zone would make the period maths throw.
  const activeTimezone = data?.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const today = localDate(new Date(), activeTimezone)
  const thisYear = Number(today.slice(0, 4))
  const thisMonth = Number(today.slice(5, 7))
  const since = data?.memberSince ?? null
  const sinceYear = since ? Number(since.slice(0, 4)) : 2000, sinceMonth = since ? Number(since.slice(5, 7)) : 1
  const cards = data ? buildCards(kind, year, month, activeTimezone, data.reports, today, since) : []
  const filtered = data?.reports.filter(r => r.kind === kind) ?? []
  const shownPrefix = kind === 'week' ? `${year}-${String(month).padStart(2, '0')}` : String(year)
  const shownInYear = kind === 'year' ? filtered : filtered.filter(r => r.period_start.startsWith(shownPrefix))
  const latestStart = latestClosed(kind, activeTimezone).start
  // A period that has ended but has no reflection yet: the one the member picked, else the latest one when nothing else is chosen.
  const focusCard = cards.find(c => c.state === 'available' && c.key === focusStart)
    ?? (!selectedId && !shownInYear.length ? cards.find(c => c.state === 'available' && c.key === latestStart) : undefined)
  const report = focusCard ? undefined : filtered.find(r => r.id === selectedId) ?? shownInYear[0]
  const focusYear = focusCard?.year, focusIndex = focusCard?.index
  // What the focused period's reflection will draw on, before it is prepared.
  useEffect(() => {
    if (!data || focusYear === undefined || focusIndex === undefined) { setPreview(null); return }
    let cancelled = false
    setPreview(null)
    const timer = setTimeout(() => {
      const sp = new URLSearchParams({ kind, year: String(focusYear), index: String(focusIndex) })
      fetch(`/api/reflections/preview?${sp.toString()}`, { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : null))
        .then((body: { preview?: PeriodReviewSourceChips | null } | null) => { if (!cancelled) setPreview(body?.preview ?? null) })
        .catch(() => { if (!cancelled) setPreview(null) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [data, kind, focusYear, focusIndex])
  const period = report ? { kind: report.kind, start: report.period_start, end: report.period_end, timezone: report.timezone } : null
  const title = period ? periodLabel(period) : 'Your reflection'
  const unit = kind
  function changeKind(next: PeriodKind) {
    setKind(next); setSelectedId(null); setFocusStart(null); setShareOpen(false)
    const closed = latestClosed(next, activeTimezone).start, latest = since && since.slice(0, 7) > closed.slice(0, 7) ? since : closed
    setYear(Number(latest.slice(0, 4))); setMonth(Number(latest.slice(5, 7)))
  }
  function changeYear(next: number) { setYear(next); setSelectedId(null); setFocusStart(null); setShareOpen(false) }
  function changeMonth(delta: number) {
    const next = (year * 12 + month - 1) + delta
    setYear(Math.floor(next / 12)); setMonth(next % 12 + 1); setSelectedId(null); setFocusStart(null); setShareOpen(false)
  }
  // Saves the detected timezone first when the member has never confirmed one, so the first click just works.
  function withTimezone(payload: Payload): Payload[] {
    return data?.settings.timezone ? [payload] : [{ action: 'preferences', timezone: activeTimezone, automatic, include_goals: includeGoals }, payload]
  }
  function prepare(card: { kind: PeriodKind; year: number; index: number; start: string }, force = false) {
    setPendingStart(card.start)
    void action(withTimezone({ action: 'generate', kind: card.kind, year: card.year, index: card.index, ...(force ? { force: true } : {}) }), 'Your reflection is ready.')
  }
  function openCard(card: PeriodCard) {
    setShareOpen(false)
    if (card.report) { setSelectedId(card.report.id); setFocusStart(null) }
    else if (card.state === 'available') setFocusStart(card.start)
  }
  function openShare() {
    setShareText(''); setShareOpen(true)
    window.setTimeout(() => document.getElementById('reflection-share')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  async function downloadCard() {
    const svgUrl = URL.createObjectURL(new Blob([reflectionShareCard(title, shareText)], { type: 'image/svg+xml' }))
    try {
      const picture = new Image()
      picture.src = svgUrl
      await picture.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 1080; canvas.height = 1080
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Your browser could not prepare this card.')
      context.drawImage(picture, 0, 0)
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Your card could not be downloaded.')), 'image/png'))
      const pngUrl = URL.createObjectURL(png)
      const link = document.createElement('a'); link.href = pngUrl; link.download = 'my-year-unwrapped.png'; link.click()
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000)
    } catch { setError('Your card could not be downloaded. Please try again.') }
    finally { URL.revokeObjectURL(svgUrl) }
  }
  // No included entries yet: a note about what gets woven in, never a reason to hide the sky.
  const showEmptyState = data?.consentV2Enabled && data?.includedEntriesCount === 0
  const sky = report?.analysis?.sky ?? null
  const content = report?.content
  const quarterlyReviewHref = journalIaEmbed ? '/journal/look-back?view=quarter' : '/year?view=review'
  const reflectionsHomeHref = journalIaEmbed ? '/journal/look-back' : '/reflections'
  const explainer = <p className={(journalIaEmbed ? 'shell-prose text-sm ' : '') + 'leading-relaxed text-bone-muted'}>
    Every look back starts with the sky you moved through, read against your own chart. Kairos weaves in the journal entries and conversations you’ve chosen to include, along with the plans and sessions you finished and your check-ins. A stretch with nothing recorded is still read. Your Quarterly Review is different: that’s the one you write yourself.{' '}
    <Link href={quarterlyReviewHref} className="whitespace-nowrap text-bone underline underline-offset-4">Write your Quarterly Review</Link>
  </p>
  return <div className={journalIaEmbed ? 'space-y-8 text-bone' : 'mx-auto max-w-5xl space-y-8 px-5 py-10 text-bone sm:px-8'}>
    {!journalIaEmbed ? (
      <header className="max-w-2xl space-y-3">
        <p className="text-xs uppercase tracking-[.24em] text-amber-200/70">Your lived year</p>
        <h1 className="font-display text-4xl sm:text-5xl">{kind === 'year' ? 'Yearly Unwrapped' : 'A little space to look back'}</h1>
        {explainer}
      </header>
    ) : (
      <header className="max-w-2xl space-y-2">
        <h2 className="font-display text-[1.4rem] text-bone">{kind === 'year' ? 'Yearly Unwrapped' : 'A little space to look back'}</h2>
        {explainer}
      </header>
    )}
    {showEmptyState && <ConsentEmptyState variant="reflections" />}
    {!journalIaEmbed ? (
      <nav aria-label="Reflection periods" className="flex flex-wrap gap-2">
        {(['week', 'month', 'quarter', 'year'] as const).map(k => <button key={k} type="button" aria-pressed={kind === k} onClick={() => changeKind(k)}
          className={buttonClass + (kind === k ? ' bg-amber-100/10 text-amber-100' : '')}>{k === 'week' ? 'Weekly' : k === 'month' ? 'Monthly' : k === 'quarter' ? 'Quarterly' : 'Yearly Unwrapped'}</button>)}
      </nav>
    ) : null}
    {loading && <p role="status">Gathering your reflections…</p>}
    {error && <div role="alert" className="rounded-xl border border-rose-200/30 p-4"><p>{error}</p><button type="button" className={buttonClass + ' mt-3'} onClick={() => { setError(''); load(true).catch(e => setError(e.message)) }}>Try again</button></div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-100/10 p-4">{notice}</p>}
    {data && <>
      <section aria-label="Choose a period" className="space-y-4">
        {kind === 'week' && <div className="flex items-center gap-3">
          <button type="button" aria-label="Previous month" className={pillClass} disabled={year * 12 + month <= sinceYear * 12 + sinceMonth} onClick={() => changeMonth(-1)}>←</button>
          <h2 className="font-display text-2xl">{monthName(month)} {year}</h2>
          <button type="button" aria-label="Next month" className={pillClass} disabled={year * 12 + month >= thisYear * 12 + thisMonth} onClick={() => changeMonth(1)}>→</button>
        </div>}
        {(kind === 'month' || kind === 'quarter') && <div className="flex items-center gap-3">
          <button type="button" aria-label="Previous year" className={pillClass} disabled={year <= sinceYear} onClick={() => changeYear(year - 1)}>←</button>
          <h2 className="font-display text-2xl tabular-nums">{year}</h2>
          <button type="button" aria-label="Next year" className={pillClass} disabled={year >= thisYear} onClick={() => changeYear(year + 1)}>→</button>
        </div>}
        <ul className={'grid gap-3 ' + (kind === 'week' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : kind === 'month' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : kind === 'quarter' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
          {cards.map(card => {
            const selected = focusCard ? focusCard.key === card.key : !!report && report.period_start === card.start
            const preparing = busy && pendingStart === card.start
            const readable = card.state === 'ready' || (card.state === 'empty' && !!card.report?.analysis?.sky)
            const status = preparing ? 'Preparing…' : card.state === 'empty' && readable ? 'Ready to read · from the sky' : card.state === 'available' && data.settings.automatic ? 'On its way · or prepare now' : card.state === 'open' ? `Closes ${dayLabel(lastDay(card.end))}` : CARD_COPY[card.state]
            const clickable = !!card.report || card.state === 'available'
            const tone = readable ? 'border-amber-200/40 bg-amber-100/[.06]' : card.state === 'available' ? 'border-white/25' : clickable ? 'border-white/15' : 'border-white/10 opacity-50'
            return <li key={card.key}>
              <button type="button" disabled={!clickable || busy} aria-current={selected ? 'true' : undefined}
                aria-label={`${kind === 'week' ? periodLabel({ kind, start: card.start, end: card.end, timezone: activeTimezone }) : kind === 'month' ? `${card.label} ${card.year}` : kind === 'quarter' ? `${card.label} ${card.year}` : `${card.label} Unwrapped`}: ${status}`}
                onClick={() => openCard(card)}
                className={`flex h-full w-full flex-col items-start gap-1 rounded-xl border p-4 text-left transition enabled:hover:bg-white/[.06] disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${tone} ${selected ? 'ring-2 ring-amber-200/60' : ''}`}>
                <span className="font-display text-lg">{card.label}</span>
                <span className={'text-xs ' + (readable ? 'text-amber-100/90' : 'text-bone-muted')}>{status}</span>
              </button>
            </li>
          })}
        </ul>
        <p className="text-sm text-bone-muted">
          A {unit} can be prepared once it has ended{kind === 'week' || kind === 'month' ? '' : ', and a rich one may take a few minutes'}.{' '}
          {data.settings.automatic ? 'Reflections are prepared for you each morning, including any you missed, a few at a time.' : 'You choose when each one is prepared.'}
          {' '}Times follow <span className="text-bone">{activeTimezone}</span>.{' '}
          <button type="button" aria-expanded={prefsOpen} className={linkButtonClass} onClick={() => setPrefsOpen(!prefsOpen)}>Preferences</button>
        </p>
        {prefsOpen && <form aria-label="Reflection preferences" className="space-y-4 rounded-xl border border-white/15 p-5" onSubmit={e => { e.preventDefault(); void action({ action: 'preferences', timezone, automatic, include_goals: includeGoals }, 'Your reflection preferences are saved.').then(ok => { if (ok) setPrefsOpen(false) }) }}>
          <label className="block space-y-2"><span>Timezone</span><input required value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="America/New_York" className={inputClass} /></label>
          <p className="text-sm text-bone-muted">Your months and quarters close at midnight in this timezone.</p>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={automatic} onChange={e => setAutomatic(e.target.checked)} /><span>Prepare reflections automatically after each week, month, quarter and year ends, including any you missed since you joined.</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={includeGoals} onChange={e => setIncludeGoals(e.target.checked)} /><span>Include a little goal context when it connects to my experience.</span></label>
          <p className="text-sm text-bone-muted">Only journal entries and saved conversations you allow in Insights are included. Plans and learning sessions you finished and your check-ins are read too. Your reports stay private.</p>
          <div className="flex flex-wrap gap-3"><button disabled={busy} className={buttonClass}>Save preferences</button><button type="button" className={buttonClass} onClick={() => setPrefsOpen(false)}>Cancel</button></div>
        </form>}
      </section>
      {focusCard && (() => {
        const label = periodLabel({ kind, start: focusCard.start, end: focusCard.end, timezone: activeTimezone })
        return <section aria-label={`Prepare ${label}`} className="space-y-5 rounded-2xl border border-white/15 bg-white/[.025] p-6 sm:p-9">
          <header><p className="text-xs uppercase tracking-widest text-amber-200/70">Ready to prepare</p><h2 className="mt-2 font-display text-3xl">{label}</h2>
            <p className="mt-3 text-bone-muted">This {unit} has ended. Kairos can read the sky you moved through and bring in whatever you chose to share from it.</p></header>
          {preview ? <LookBackPreview chips={preview} periodNoun={kind} /> : null}
          <button type="button" disabled={busy} className={buttonClass} onClick={() => prepare({ kind, ...focusCard })}>{busy && pendingStart === focusCard.start ? 'Preparing your reflection…' : `Reflect on ${label}`}</button>
        </section>
      })()}
      {!report && !focusCard && <div className="rounded-xl border border-dashed border-white/20 p-8"><h2 className="font-display text-2xl">Your story has room here.</h2><p className="mt-3 text-bone-muted">{cards.some(c => c.state === 'available') ? `Choose a ${unit} marked “Ready to prepare” above.` : `Once your first ${unit} as a member has ended, it will be ready here.`} We’ll read the sky you moved through and bring in whatever you chose to share.</p></div>}
      {report && content && kind === 'year' && <UnwrappedStory frames={buildStoryFrames(content, report.analysis, report.sources)}
        title={`${report.period_start.slice(0, 4)}, unwrapped`}
        lede={`Written for you from the ${report.analysis?.observedDays ?? 0} days you recorded and the conversations you chose to include. Start with the story, or skip to the full report.`}
        reportAnchor="unwrapped-report" onShare={openShare} />}
      {report && <article id={kind === 'year' ? 'unwrapped-report' : undefined} className="scroll-mt-6 space-y-7 rounded-2xl border border-white/15 bg-white/[.025] p-6 sm:p-9" aria-label={title}>
        <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-amber-200/70">{kind === 'year' ? 'The full report' : report.status === 'empty' && sky ? 'A look back, read from the sky' : 'A reflection, in perspective'}</p><h2 className="mt-2 font-display text-3xl">{title}</h2>
          {report.analysis && <p className="mt-3 text-sm text-bone-muted">{report.analysis.observedDays === 0 && sky
            ? `Nothing of yours is on record for these ${report.analysis.totalDays} days, so this reads the sky and your chart.`
            : `Based on ${report.analysis.observedDays} recorded days across ${report.analysis.totalDays} calendar days. Unrecorded days are unknown.`}</p>}
          {report.generated_at && <p className="mt-1 text-xs text-bone-muted">Prepared {new Date(report.generated_at).toLocaleDateString()} · Private</p>}
          </div>
          {kind === 'year' && content ? <button type="button" className={buttonClass} onClick={openShare}>Download a share card</button> : null}
        </header>
        {report.status === 'empty' && sky && <SkyReadingView reading={sky} unit={kind} quiet />}
        {report.status === 'empty' && !sky && <div className="space-y-3"><p>Nothing of yours is on record for this {unit}, and its sky has not been read yet.</p>
          <div className="flex flex-wrap items-center gap-4"><button type="button" disabled={busy} className={buttonClass} onClick={() => {
            const m = Number(report.period_start.slice(5,7)), w = weekOf(report.period_start)
            prepare({ kind: report.kind, year: report.kind === 'week' ? w.year : Number(report.period_start.slice(0,4)), index: report.kind === 'week' ? w.index : report.kind === 'month' ? m : report.kind === 'quarter' ? Math.ceil(m/3) : 1, start: report.period_start }, true)
          }}>{busy && pendingStart === report.period_start ? 'Reading the sky…' : `Read the sky for this ${unit}`}</button>
          <Link href="/journal" className="underline underline-offset-4">Or make space for a journal entry</Link></div></div>}
        {['stale','failed','generating'].includes(report.status) && <div className="space-y-3"><p>{report.status === 'generating' ? 'Your reflection is being prepared.' : report.status === 'stale' ? 'Your information has changed. Refresh this reflection to include your latest choices.' : 'This reflection could not be completed. You can try again.'}</p>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => {
            const month = Number(report.period_start.slice(5,7))
            prepare({ kind: report.kind, year: Number(report.period_start.slice(0,4)), index: report.kind === 'month' ? month : report.kind === 'quarter' ? Math.ceil(month/3) : 1, start: report.period_start })
          }}>Refresh reflection</button></div>}
        {content && <div className={kind === 'year' ? 'grid gap-10 lg:grid-cols-[190px_minmax(0,1fr)]' : 'space-y-7'}>
          {kind === 'year' ? <nav aria-label="Report sections" className="hidden lg:block"><ol className="sticky top-6 space-y-1 border-l border-white/10 pl-4 text-sm" style={{ listStyle: 'none' }}>
            {[['opening', 'Opening', true], ['chapters', 'Chapters of your year', !!report.analysis], ['moments', 'Moments that mattered', content.moments.length > 0], ['sky', 'The sky you moved through', !!sky], ['rhythms', 'Rhythms and rest', !!content.rhythms],
              ['showed-up', 'What showed up', content.observations.length > 0], ['turning', 'Turning points', !!content.turningPoints], ['discoveries', 'Connections', !!content.discoveries],
              ['next', 'What comes next', true], ['letter', 'A letter', !!content.letter], ['share', 'Share a moment', true]]
              .filter(([, , on]) => on).map(([id, label]) => <li key={String(id)}><a href={`#reflection-${id}`} className="block py-1.5 text-bone-muted hover:text-bone">{label}</a></li>)}
          </ol></nav> : null}
          <div className={kind === 'year' ? 'max-w-[700px] space-y-10' : 'space-y-7'}>
          <section id="reflection-opening" className="scroll-mt-6">{kind === 'year'
            ? <div className="space-y-2"><p className="whitespace-pre-line font-display text-2xl italic leading-relaxed">{content.opening.text}</p><EvidenceView ids={content.opening.sources} report={report} /></div>
            : <PassageView passage={content.opening} report={report} />}</section>
          {kind === 'year' && report.analysis ? <section id="reflection-chapters" className="scroll-mt-6 space-y-4"><h3 className="font-display text-2xl">Chapters of your year</h3>
            <p className="text-sm text-bone-muted">Recorded days show the shape of what you shared, not a score for your year.</p>
            <ChapterBars months={report.analysis.months} />
          </section> : null}
          {!!content.moments.length && <section id="reflection-moments" className="scroll-mt-6 space-y-4"><h3 className="font-display text-2xl">Moments that mattered</h3>{content.moments.map((p,i) => <PassageView key={i} passage={p} report={report} />)}</section>}
          {sky && <SkyReadingView reading={sky} unit={kind} quiet={false} />}
          {content.rhythms && <section id="reflection-rhythms" className="scroll-mt-6 space-y-3"><h3 className="font-display text-2xl">Rhythms and rest</h3><PassageView passage={content.rhythms} report={report} /></section>}
          {!!content.observations.length && <section id="reflection-showed-up" className="scroll-mt-6 space-y-5"><h3 className="font-display text-2xl">What showed up</h3>{content.observations.map(o => <div key={o.key} className="space-y-3 border-l border-amber-200/30 pl-4">
            <p className="text-xs uppercase tracking-widest text-bone-muted">{o.kind.replace(/_/g,' ')}</p><PassageView passage={{ text: o.text, sources: [...new Set([...o.sources, ...o.contradictingSources])] }} report={report} />
            <ObservationFeedback claim={o.key} existing={data.feedback.find(f => f.report_id === report.id && f.claim_key === o.key)} busy={busy}
              onSave={(verdict, note) => action({ action: 'feedback', report_id: report.id, claim_key: o.key, verdict, note },
                verdict === 'confirmed' ? 'Thank you. That’s noted.' : 'Your perspective is saved. Refresh the reflection to include it.')} />
          </div>)}</section>}
          {content.turningPoints && <section id="reflection-turning" className="scroll-mt-6 space-y-3"><h3 className="font-display text-2xl">Turning points</h3><PassageView passage={content.turningPoints} report={report} /></section>}
          {content.discoveries && <section id="reflection-discoveries" className="scroll-mt-6 space-y-3"><h3 className="font-display text-2xl">Connections and discoveries</h3><PassageView passage={content.discoveries} report={report} /></section>}
          {content.goalThread && data.settings.include_goals && <aside className="space-y-3 rounded-xl bg-amber-100/[.04] p-4"><h3 className="text-sm text-amber-100/80">A thread to something you care about</h3><PassageView passage={content.goalThread} report={report} /></aside>}
          <section id="reflection-next" className="scroll-mt-6 space-y-4"><h3 className="font-display text-2xl">A little direction for what comes next</h3><PassageView passage={content.lookingAhead.focus} report={report} />
            {!!content.lookingAhead.experiments.length && <p className="text-sm text-bone-muted">Small things you could try. Carry forward any that feel right, and you can note how they went later.</p>}
            {content.lookingAhead.experiments.map((p,i) => <ExperimentCard key={i} passage={p} report={report} busy={busy}
              carried={data.intentions.some(item => item.report_id === report.id && item.suggestion_index === i)}
              onCarry={text => action({ action: 'intention', report_id: report.id, suggestion_index: i, text }, 'Your intention is saved. You can note how it goes below.')} />)}
          </section>
          {content.letter && <section id="reflection-letter" className={kind === 'year' ? 'scroll-mt-6 space-y-4 rounded-[18px] border border-white/15 p-7 sm:p-9' : 'space-y-3 border-t border-white/10 pt-6'}
            style={kind === 'year' ? { background: 'linear-gradient(170deg,#21243a,#11131e)' } : undefined}>
            {kind === 'year' ? <p className="text-sm tracking-wide text-violet-300/90">A letter to carry with you</p> : <h3 className="font-display text-2xl">A letter to carry with you</h3>}
            {kind === 'year' ? <div className="space-y-2"><p className="whitespace-pre-line font-display text-xl italic leading-relaxed">{content.letter.text}</p><EvidenceView ids={content.letter.sources} report={report} /></div> : <PassageView passage={content.letter} report={report} />}
          </section>}
          {kind === 'year' && <section id="reflection-share" className="scroll-mt-6 space-y-4">
            <Link href={reflectionsHomeHref} className="inline-block underline underline-offset-4">Visit your monthly and quarterly reflections</Link>
            <button type="button" className={buttonClass + ' ml-3'} onClick={() => { setShareText(''); setShareOpen(!shareOpen) }}>Choose a moment to share</button>
            {shareOpen && <div className="space-y-3 rounded-xl border border-white/15 p-5"><p>Only the text you choose below goes into your downloaded card. Review it before sharing.</p><label className="block space-y-2"><span>Card text</span><textarea value={shareText} onChange={e => setShareText(e.target.value)} maxLength={450} rows={5} className={inputClass} placeholder="A moment or lesson you want to share…" /></label><p className="text-sm text-bone-muted">Card heading: {title}</p><blockquote className="border-l border-amber-200/30 pl-4">{shareText || 'Your chosen words will appear here.'}</blockquote><button type="button" disabled={!shareText.trim()} className={buttonClass} onClick={downloadCard}>Download private preview card</button></div>}
          </section>}
          </div>
        </div>}
      </article>}
      {!!data.intentions.length && <section className="space-y-4"><h2 className="font-display text-2xl">What you’re carrying forward</h2><p className="text-bone-muted">A place to notice what helped, what changed, or what you chose to let go.</p>
        <ul className="space-y-3">{data.intentions.map(item => <IntentionItem key={item.id} item={item} busy={busy}
          onSave={(text, outcome) => action({ action: 'outcome', id: item.id, text, outcome }, 'Your experience is saved for future reflections.')} />)}</ul>
      </section>}
    </>}
  </div>
}
function ObservationFeedback({ claim, existing, busy, onSave }: { claim: string; existing?: Feedback; busy: boolean; onSave: (verdict: Feedback['verdict'], note: string) => Promise<boolean> }) {
  const [differently, setDifferently] = useState(false)
  return <div className="space-y-3">
    <div role="group" aria-label={`Does this feel accurate? (${claim})`} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-bone-muted">Does this feel accurate?</span>
      <button type="button" disabled={busy} aria-pressed={existing?.verdict === 'confirmed'} className={pillClass + (existing?.verdict === 'confirmed' ? ' bg-emerald-100/10 text-emerald-100' : '')} onClick={() => { setDifferently(false); void onSave('confirmed', '') }}>Feels true</button>
      <button type="button" disabled={busy} aria-expanded={differently} aria-pressed={existing?.verdict === 'corrected'} className={pillClass + (differently || existing?.verdict === 'corrected' ? ' bg-amber-100/10 text-amber-100' : '')} onClick={() => setDifferently(!differently)}>I see it differently</button>
      <button type="button" disabled={busy} aria-pressed={existing?.verdict === 'dismissed'} className={pillClass} onClick={() => { setDifferently(false); void onSave('dismissed', '') }}>Leave this out</button>
    </div>
    {differently && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void onSave('corrected', String(new FormData(e.currentTarget).get('note') ?? '')) }}>
      <label className="block space-y-2"><span className="text-sm">How do you see it?</span><textarea name="note" defaultValue={existing?.verdict === 'corrected' ? existing.note : ''} maxLength={1000} rows={3} className={inputClass} /></label>
      <button disabled={busy} className={buttonClass}>Save response</button>
    </form>}
  </div>
}
function ExperimentCard({ passage, report, carried, busy, onCarry }: { passage: Passage; report: SavedReport; carried: boolean; busy: boolean; onCarry: (text: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  return <div className="space-y-3 rounded-xl border border-white/10 p-4">
    <p className="leading-7">{passage.text}</p>
    <EvidenceView ids={passage.sources} report={report} />
    {carried ? <p className="text-sm text-emerald-100/80">You’re carrying this forward. It’s waiting for you below.</p>
      : editing ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); void onCarry(String(new FormData(e.currentTarget).get('text') ?? '')) }}>
          <label className="block space-y-2"><span className="text-sm">In your own words</span><textarea name="text" defaultValue={passage.text} required maxLength={1000} rows={3} className={inputClass} /></label>
          <div className="flex flex-wrap gap-3"><button disabled={busy} className={buttonClass}>Carry this forward</button><button type="button" className={buttonClass} onClick={() => setEditing(false)}>Cancel</button></div>
        </form>
      : <div className="flex flex-wrap items-center gap-4"><button type="button" disabled={busy} className={buttonClass} onClick={() => void onCarry(passage.text)}>Carry this forward</button><button type="button" className={linkButtonClass} onClick={() => setEditing(true)}>Put it in my own words</button></div>}
  </div>
}
function IntentionItem({ item, busy, onSave }: { item: Intention; busy: boolean; onSave: (text: string, outcome: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  if (!editing) return <li className="space-y-2 rounded-xl border border-white/15 p-5">
    <p className="leading-7">{item.text}</p>
    {item.outcome ? <p className="whitespace-pre-line text-sm text-bone-muted"><span className="text-bone">What you noticed:</span> {item.outcome}</p> : null}
    <button type="button" className={linkButtonClass} onClick={() => setEditing(true)}>{item.outcome ? 'Edit' : 'Add how it went'}</button>
  </li>
  return <li><form className="space-y-3 rounded-xl border border-white/15 p-5" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void onSave(String(form.get('text') ?? ''), String(form.get('outcome') ?? '')).then(ok => { if (ok) setEditing(false) }) }}>
    <label className="block space-y-2"><span className="text-sm">Your intention</span><textarea name="text" defaultValue={item.text} maxLength={1000} required rows={2} className={inputClass} /></label>
    <label className="block space-y-2"><span className="text-sm">How has it gone?</span><textarea name="outcome" defaultValue={item.outcome ?? ''} maxLength={1000} rows={3} className={inputClass} placeholder="No result is required. You can simply describe what you noticed." /></label>
    <div className="flex flex-wrap gap-3"><button disabled={busy} className={buttonClass}>Save what I noticed</button><button type="button" className={buttonClass} onClick={() => setEditing(false)}>Cancel</button></div>
  </form></li>
}
const CHAPTER_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function ChapterBars({ months }: { months: { month: string; days: number }[] }) {
  const most = Math.max(1, ...months.map(m => m.days))
  return <ol className="grid h-40 grid-cols-12 items-end gap-1.5" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Days recorded each month">
    {months.map(m => <li key={m.month} className="flex h-full flex-col items-center justify-end gap-1.5" title={`${m.days} days`}>
      <span className="text-[11px] text-bone-muted">{m.days}</span>
      <b className="block w-full rounded-t-md" style={{ height: `${Math.max(4, (m.days / most) * 100)}%`, background: 'linear-gradient(to top,#5a3eba,#a98aef)', opacity: m.days ? 1 : 0.25 }} />
      <span className="text-[10px] uppercase tracking-wider text-bone-muted">{CHAPTER_MONTHS[Number(m.month.slice(5, 7)) - 1] ?? m.month}</span>
    </li>)}
  </ol>
}
function EvidenceView({ ids, report }: { ids: string[]; report: SavedReport }) {
  const sources = report.sources.filter(e => ids.includes(e.id))
  if (!sources.length) return null
  return <details className="text-sm text-bone-muted"><summary className="w-fit cursor-pointer text-xs tracking-wide text-bone-muted/80 hover:text-bone">Where this comes from ({sources.length})</summary><ul className="mt-3 space-y-3">{sources.map(e => <li key={e.id} className="rounded-lg border border-white/10 p-3"><p className="font-medium text-bone">{e.title} · {e.date}</p><p className="mt-2 whitespace-pre-line">{e.text}</p>{!e.authored && <p className="mt-2 text-xs">Saved AI guidance, not a recorded life event.</p>}{e.kind === 'journal' && <Link href={`/journal?entry=${encodeURIComponent(e.id.slice('journal:'.length))}`} className="mt-2 inline-block underline">Open journal</Link>}</li>)}</ul></details>
}
function PassageView({ passage, report }: { passage: Passage; report: SavedReport }) {
  return <div className="space-y-2"><p className="whitespace-pre-line text-base leading-8">{passage.text}</p><EvidenceView ids={passage.sources} report={report} /></div>
}
