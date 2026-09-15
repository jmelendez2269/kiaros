'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Feedback, Intention, Preferences, SavedReport } from '@/lib/reflections/report-schema'
import { latestClosed, periodLabel, type PeriodKind } from '@/lib/reflections/periods'
import { reflectionShareCard } from '@/lib/reflections/share-card'
type State = { settings: Preferences; reports: SavedReport[]; feedback: Feedback[]; intentions: Intention[] }
type Passage = { text: string; sources: string[] }
const inputClass = 'w-full rounded-lg border border-white/20 bg-transparent p-3 text-bone focus:outline-none focus:ring-2 focus:ring-amber-200/60'
const buttonClass = 'rounded-lg border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'
export function ReflectionsHub({ initialKind = 'month' }: { initialKind?: PeriodKind }) {
  const [data, setData] = useState<State | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<PeriodKind>(initialKind), [year, setYear] = useState(new Date().getFullYear())
  const [index, setIndex] = useState(1), [selectedId, setSelectedId] = useState<string | null>(null)
  const [timezone, setTimezone] = useState(''), [automatic, setAutomatic] = useState(false), [includeGoals, setIncludeGoals] = useState(true)
  const [shareText, setShareText] = useState(''), [shareOpen, setShareOpen] = useState(false)
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
      const period = latestClosed(initialKind, tz)
      setYear(Number(period.start.slice(0, 4)))
      setIndex(initialKind === 'quarter' ? Math.ceil(Number(period.start.slice(5, 7)) / 3) : initialKind === 'month' ? Number(period.start.slice(5, 7)) : 1)
    }
  }, [initialKind])
  useEffect(() => { load(true).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [load])
  // Refresh on return to the page so consent changes elsewhere cannot leave an old report on screen.
  useEffect(() => {
    const refresh = () => { if (!document.hidden) { setData(null); load().catch(e => setError(e.message)) } }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [load])
  async function action(payload: Record<string, unknown>, message: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/reflections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Please try again')
      setData(null); await load()
      if (result.id) setSelectedId(result.id)
      setNotice(message)
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again') }
    finally { setBusy(false) }
  }
  const filtered = data?.reports.filter(r => r.kind === kind) ?? []
  const report = filtered.find(r => r.id === selectedId) ?? filtered[0]
  const period = report ? { kind: report.kind, start: report.period_start, end: report.period_end, timezone: report.timezone } : null
  const title = period ? periodLabel(period) : 'Your reflection'
  function changeKind(next: PeriodKind) {
    setKind(next); setSelectedId(null); setShareOpen(false)
    const p = latestClosed(next, data?.settings.timezone || timezone || 'UTC')
    setYear(Number(p.start.slice(0,4))); setIndex(next === 'month' ? Number(p.start.slice(5,7)) : next === 'quarter' ? Math.ceil(Number(p.start.slice(5,7))/3) : 1)
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
  const content = report?.content
  return <div className="mx-auto max-w-5xl space-y-8 px-5 py-10 text-bone sm:px-8">
    <header className="max-w-2xl space-y-3">
      <p className="text-xs uppercase tracking-[.24em] text-amber-200/70">Your lived year</p>
      <h1 className="font-display text-4xl sm:text-5xl">{kind === 'year' ? 'Yearly Unwrapped' : 'A little space to look back'}</h1>
      <p className="leading-relaxed text-bone-muted">The moments, changes, and quiet discoveries that made this time yours. A gentle direction for what comes next.</p>
      <Link href="/year?view=review" className="inline-block text-sm underline underline-offset-4">Write your own quarterly reflection</Link>
    </header>
    <nav aria-label="Reflection periods" className="flex flex-wrap gap-2">
      {(['month', 'quarter', 'year'] as const).map(k => <button key={k} type="button" aria-pressed={kind === k} onClick={() => changeKind(k)}
        className={buttonClass + (kind === k ? ' bg-amber-100/10 text-amber-100' : '')}>{k === 'month' ? 'Monthly' : k === 'quarter' ? 'Quarterly' : 'Yearly Unwrapped'}</button>)}
    </nav>
    {loading && <p role="status">Gathering your reflections…</p>}
    {error && <div role="alert" className="rounded-xl border border-rose-200/30 p-4"><p>{error}</p><button type="button" className={buttonClass + ' mt-3'} onClick={() => { setError(''); load(true).catch(e => setError(e.message)) }}>Try again</button></div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-100/10 p-4">{notice}</p>}
    {data && <>
      <details className="rounded-xl border border-white/15 p-5" open={!data.settings.timezone}>
        <summary className="cursor-pointer font-medium">Reflection preferences</summary>
        <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); void action({ action: 'preferences', timezone, automatic, include_goals: includeGoals }, 'Your reflection preferences are saved.') }}>
          <label className="block space-y-2"><span>Timezone</span><input required value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="America/New_York" className={inputClass} /></label>
          <p className="text-sm text-bone-muted">Your months and quarters close in this timezone. Confirm it before your first reflection.</p>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={automatic} onChange={e => setAutomatic(e.target.checked)} /><span>Prepare reflections automatically after each month, quarter, and year ends.</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={includeGoals} onChange={e => setIncludeGoals(e.target.checked)} /><span>Include a little goal context when it connects to my experience.</span></label>
          <p className="text-sm text-bone-muted">Only journal entries and saved conversations you allow in Insights are included. Your reports stay private.</p>
          <button disabled={busy} className={buttonClass}>Save preferences</button>
        </form>
      </details>
      <section aria-label="Create a reflection" className="rounded-xl border border-white/15 p-5">
        <form className="flex flex-wrap items-end gap-4" onSubmit={e => { e.preventDefault(); void action({ action: 'generate', kind, year, index }, 'Your reflection is ready.') }}>
          <label className="space-y-2"><span className="block text-sm">Year</span><input type="number" min="2000" max="2100" required value={year} onChange={e => setYear(Number(e.target.value))} className={inputClass + ' max-w-28'} /></label>
          {kind !== 'year' && <label className="space-y-2"><span className="block text-sm">{kind === 'month' ? 'Month' : 'Quarter'}</span><select className={inputClass} value={index} onChange={e => setIndex(Number(e.target.value))}>
            {Array.from({ length: kind === 'month' ? 12 : 4 }, (_, i) => <option className="bg-zinc-900" key={i+1} value={i+1}>{kind === 'quarter' ? 'Q' + (i+1) : new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026,i,1)))}</option>)}
          </select></label>}
          <button className={buttonClass} disabled={busy || !data.settings.timezone}>{busy ? 'Preparing your reflection…' : 'Reflect on this period'}</button>
        </form>
        <p className="mt-3 text-sm text-bone-muted">Available once the period has ended. A rich quarter or year may take a few minutes.</p>
      </section>
      {filtered.length > 0 && <label className="block space-y-2"><span className="text-sm">Reflection history</span><select className={inputClass} value={report?.id ?? ''} onChange={e => { setSelectedId(e.target.value); setShareOpen(false) }}>
        {filtered.map(r => <option key={r.id} value={r.id} className="bg-zinc-900">{periodLabel({ kind: r.kind, start: r.period_start, end: r.period_end, timezone: r.timezone })} · {r.status}</option>)}
      </select></label>}
      {!report && <div className="rounded-xl border border-dashed border-white/20 p-8"><h2 className="font-display text-2xl">Your story has room here.</h2><p className="mt-3 text-bone-muted">Choose a completed period above. We’ll bring together the information you chose to share, with space for your own perspective.</p></div>}
      {report && <article className="space-y-7 rounded-2xl border border-white/15 bg-white/[.025] p-6 sm:p-9" aria-label={title}>
        <header><p className="text-xs uppercase tracking-widest text-amber-200/70">{kind === 'year' ? 'Your lived year' : 'A reflection, in perspective'}</p><h2 className="mt-2 font-display text-3xl">{title}</h2>
          {report.analysis && <p className="mt-3 text-sm text-bone-muted">Based on {report.analysis.observedDays} recorded days across {report.analysis.totalDays} calendar days. Unrecorded days are unknown.</p>}
          {report.generated_at && <p className="mt-1 text-xs text-bone-muted">Prepared {new Date(report.generated_at).toLocaleDateString()} · Private</p>}
        </header>
        {report.status === 'empty' && <div className="space-y-3"><p>There isn’t enough shared information to write a grounded reflection for this period yet.</p><p className="text-bone-muted">What stayed with you? What gave you room to breathe? What would you like to carry forward?</p><Link href="/journal" className="underline">Make space for a journal entry</Link></div>}
        {['stale','failed','generating'].includes(report.status) && <div className="space-y-3"><p>{report.status === 'generating' ? 'Your reflection is being prepared.' : report.status === 'stale' ? 'Your information has changed. Refresh this reflection to include your latest choices.' : 'This reflection could not be completed. You can try again.'}</p>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => {
            const month = Number(report.period_start.slice(5,7))
            void action({ action: 'generate', kind: report.kind, year: Number(report.period_start.slice(0,4)), index: report.kind === 'month' ? month : report.kind === 'quarter' ? Math.ceil(month/3) : 1 }, 'Your reflection is ready.')
          }}>Refresh reflection</button></div>}
        {content && <>
          <PassageView passage={content.opening} report={report} />
          {!!content.moments.length && <section className="space-y-4"><h3 className="font-display text-2xl">Moments that mattered</h3>{content.moments.map((p,i) => <PassageView key={i} passage={p} report={report} />)}</section>}
          {content.rhythms && <section className="space-y-3"><h3 className="font-display text-2xl">Rhythms and rest</h3><PassageView passage={content.rhythms} report={report} /></section>}
          {!!content.observations.length && <section className="space-y-5"><h3 className="font-display text-2xl">What showed up</h3>{content.observations.map(o => <div key={o.key} className="space-y-3 border-l border-amber-200/30 pl-4">
            <p className="text-xs uppercase tracking-widest text-bone-muted">{o.kind.replace(/_/g,' ')}</p><PassageView passage={{ text: o.text, sources: [...new Set([...o.sources, ...o.contradictingSources])] }} report={report} />
            <details><summary className="cursor-pointer text-sm underline underline-offset-4">Does this feel accurate?</summary>
              <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void action({ action: 'feedback', report_id: report.id, claim_key: o.key, verdict: form.get('verdict'), note: form.get('note') }, 'Your perspective is saved. Refresh the reflection to include it.') }}>
                <label className="block"><span className="sr-only">Your response to {o.key}</span><select name="verdict" className={inputClass}><option value="confirmed" className="bg-zinc-900">This feels accurate</option><option value="corrected" className="bg-zinc-900">I see it differently</option><option value="dismissed" className="bg-zinc-900">Leave this observation out</option></select></label>
                <label className="block space-y-2"><span className="text-sm">Your perspective, if you’d like to add it</span><textarea name="note" maxLength={1000} rows={3} className={inputClass} /></label><button disabled={busy} className={buttonClass}>Save response</button>
              </form>
            </details>
          </div>)}</section>}
          {content.turningPoints && <section className="space-y-3"><h3 className="font-display text-2xl">Turning points</h3><PassageView passage={content.turningPoints} report={report} /></section>}
          {content.discoveries && <section className="space-y-3"><h3 className="font-display text-2xl">Connections and discoveries</h3><PassageView passage={content.discoveries} report={report} /></section>}
          {content.goalThread && data.settings.include_goals && <aside className="space-y-3 rounded-xl bg-amber-100/[.04] p-4"><h3 className="text-sm text-amber-100/80">A thread to something you care about</h3><PassageView passage={content.goalThread} report={report} /></aside>}
          <section className="space-y-4"><h3 className="font-display text-2xl">A little direction for what comes next</h3><PassageView passage={content.lookingAhead.focus} report={report} />
            {content.lookingAhead.experiments.map((p,i) => <details key={i} className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer">{p.text}</summary><div className="mt-3"><EvidenceView ids={p.sources} report={report} /></div>
              <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void action({ action: 'intention', report_id: report.id, suggestion_index: i, text: form.get('text') }, 'Your intention is saved. You can record how it goes below.') }}>
                <label className="block space-y-2"><span className="text-sm">Make this intention your own</span><textarea name="text" defaultValue={p.text} required maxLength={1000} rows={3} className={inputClass} /></label><button disabled={busy} className={buttonClass}>Carry this forward</button>
              </form>
            </details>)}
          </section>
          {content.letter && <section className="space-y-3 border-t border-white/10 pt-6"><h3 className="font-display text-2xl">A letter to carry with you</h3><PassageView passage={content.letter} report={report} /></section>}
          {kind === 'year' && report.analysis && <section className="space-y-4"><h3 className="font-display text-2xl">Chapters of your year</h3><p className="text-sm text-bone-muted">Recorded days show the shape of the information available, not a score for your year.</p><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{report.analysis.months.map(m => <div key={m.month} className="rounded-lg border border-white/10 p-3"><p className="text-xs">{m.month}</p><p className="mt-2 text-lg">{m.days} days</p></div>)}</div>
            <Link href="/reflections" className="inline-block underline underline-offset-4">Visit your monthly and quarterly reflections</Link>
            <button type="button" className={buttonClass + ' ml-3'} onClick={() => { setShareText(''); setShareOpen(!shareOpen) }}>Choose a moment to share</button>
            {shareOpen && <div className="space-y-3 rounded-xl border border-white/15 p-5"><p>Only the text you choose below goes into your downloaded card. Review it before sharing.</p><label className="block space-y-2"><span>Card text</span><textarea value={shareText} onChange={e => setShareText(e.target.value)} maxLength={450} rows={5} className={inputClass} placeholder="A moment or lesson you want to share…" /></label><p className="text-sm text-bone-muted">Card heading: {title}</p><blockquote className="border-l border-amber-200/30 pl-4">{shareText || 'Your chosen words will appear here.'}</blockquote><button type="button" disabled={!shareText.trim()} className={buttonClass} onClick={downloadCard}>Download private preview card</button></div>}
          </section>}
        </>}
      </article>}
      {!!data.intentions.length && <section className="space-y-4"><h2 className="font-display text-2xl">What you’re carrying forward</h2><p className="text-bone-muted">A place to notice what helped, what changed, or what you chose to let go.</p>{data.intentions.map(item => <form key={item.id} className="space-y-3 rounded-xl border border-white/15 p-5" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void action({ action: 'outcome', id: item.id, text: form.get('text'), outcome: form.get('outcome') }, 'Your experience is saved for future reflections.') }}>
        <label className="block space-y-2"><span className="text-sm">Your intention</span><textarea name="text" defaultValue={item.text} maxLength={1000} required rows={2} className={inputClass} /></label>
        <label className="block space-y-2"><span className="text-sm">How has it gone?</span><textarea name="outcome" defaultValue={item.outcome ?? ''} maxLength={1000} rows={3} className={inputClass} placeholder="No result is required. You can simply describe what you noticed." /></label><button disabled={busy} className={buttonClass}>Save what I noticed</button>
      </form>)}</section>}
    </>}
  </div>
}
function EvidenceView({ ids, report }: { ids: string[]; report: SavedReport }) {
  const sources = report.sources.filter(e => ids.includes(e.id))
  return <details className="text-sm text-bone-muted"><summary className="cursor-pointer underline underline-offset-4">Why am I seeing this?</summary><ul className="mt-3 space-y-3">{sources.map(e => <li key={e.id} className="rounded-lg border border-white/10 p-3"><p className="font-medium text-bone">{e.title} · {e.date}</p><p className="mt-2 whitespace-pre-line">{e.text}</p>{!e.authored && <p className="mt-2 text-xs">Saved AI guidance, not a recorded life event.</p>}{e.kind === 'journal' && <Link href={`/journal?entry=${encodeURIComponent(e.id.slice('journal:'.length))}`} className="mt-2 inline-block underline">Open journal</Link>}</li>)}</ul></details>
}
function PassageView({ passage, report }: { passage: Passage; report: SavedReport }) {
  return <div className="space-y-2"><p className="whitespace-pre-line text-base leading-8">{passage.text}</p><EvidenceView ids={passage.sources} report={report} /></div>
}
