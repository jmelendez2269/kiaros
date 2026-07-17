'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Source = 'text' | 'url' | 'pdf'

interface ParsedItem {
  dayOffset: number
  title: string
}

interface ParseResponse {
  planTitle?: string
  items: ParsedItem[]
  warning?: string
}

export function PlanImportModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<Source>('text')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParseResponse | null>(null)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))

  function reset() {
    setText('')
    setUrl('')
    setFile(null)
    setResult(null)
    setError(null)
  }

  async function handleParse() {
    setIsParsing(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.set('source', source)
      if (source === 'text') form.set('content', text)
      if (source === 'url') form.set('content', url)
      if (source === 'pdf' && file) form.set('file', file)

      const res = await fetch('/api/plan-items/import/parse', { method: 'POST', body: form })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Could not parse that input')
        return
      }
      setResult(body as ParseResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse that input')
    } finally {
      setIsParsing(false)
    }
  }

  function updateItemTitle(index: number, title: string) {
    if (!result) return
    const items = result.items.map((item, i) => (i === index ? { ...item, title } : item))
    setResult({ ...result, items })
  }

  function removeItem(index: number) {
    if (!result) return
    setResult({ ...result, items: result.items.filter((_, i) => i !== index) })
  }

  async function handleCommit() {
    if (!result || result.items.length === 0) return
    setIsCommitting(true)
    setError(null)
    try {
      const res = await fetch('/api/plan-items/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, items: result.items }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Could not add those tasks')
        return
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add those tasks')
    } finally {
      setIsCommitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-xs font-medium text-bone-muted/70 underline-offset-2 transition-colors hover:text-bone hover:underline"
      >
        Import a plan
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-bone-muted/20 bg-stone-950 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-widest text-bone-muted/60">Import a plan</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              reset()
            }}
            className="text-sm text-bone-muted transition-colors hover:text-bone"
          >
            Close
          </button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['text', 'url', 'pdf'] as Source[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                    source === s
                      ? 'border-leather-400/60 bg-leather-500/25 text-bone'
                      : 'border-bone-muted/20 text-bone-muted hover:text-bone'
                  }`}
                >
                  {s === 'text' ? 'Paste text' : s === 'url' ? 'Paste URL' : 'Upload PDF'}
                </button>
              ))}
            </div>

            {source === 'text' && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder="Paste your plan here — a workout plan, study schedule, anything with days or weeks..."
                className="w-full rounded-md border border-bone-muted/20 bg-transparent px-3 py-2 text-sm text-bone placeholder:text-bone-muted/40 focus:border-leather-300 focus:outline-none"
              />
            )}
            {source === 'url' && (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-bone-muted/20 bg-transparent px-3 py-2 text-sm text-bone placeholder:text-bone-muted/40 focus:border-leather-300 focus:outline-none"
              />
            )}
            {source === 'pdf' && (
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-bone-muted"
              />
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="button"
              onClick={handleParse}
              disabled={isParsing || (source === 'text' && !text.trim()) || (source === 'url' && !url.trim()) || (source === 'pdf' && !file)}
              className="w-full rounded-md border border-leather-400/40 bg-leather-500/20 px-4 py-2 text-sm font-medium text-bone transition-colors hover:bg-leather-500/30 disabled:opacity-40"
            >
              {isParsing ? 'Reading plan...' : 'Parse plan'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {result.planTitle && <p className="text-base text-bone">{result.planTitle}</p>}
            {result.warning && <p className="text-xs text-amber-400">{result.warning}</p>}

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-bone-muted/60">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-bone-muted/20 bg-transparent px-3 py-1.5 text-sm text-bone focus:border-leather-300 focus:outline-none"
              />
            </div>

            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {result.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-xs text-bone-muted/60">Day {item.dayOffset + 1}</span>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateItemTitle(i, e.target.value)}
                    className="flex-1 rounded-md border border-bone-muted/15 bg-transparent px-2 py-1 text-sm text-bone focus:border-leather-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs text-bone-muted/50 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {result.items.length === 0 && (
                <p className="text-sm text-bone-muted/50">No items left to add.</p>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="flex-1 rounded-md border border-bone-muted/20 px-4 py-2 text-sm text-bone-muted hover:text-bone"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={isCommitting || result.items.length === 0}
                className="flex-1 rounded-md border border-leather-400/40 bg-leather-500/20 px-4 py-2 text-sm font-medium text-bone transition-colors hover:bg-leather-500/30 disabled:opacity-40"
              >
                {isCommitting ? 'Adding...' : `Add ${result.items.length} task${result.items.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
