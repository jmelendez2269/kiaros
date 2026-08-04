'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { BRAND } from '@/lib/brand'

// Mirrors VOICE_PRESETS keys in lib/ai/journal-insight-synthesis.ts.
// Kept in sync by hand; if presets change there, update here.
type PresetKey = 'grounded' | 'mystic' | 'clinical'
const PRESET_ORDER: PresetKey[] = ['grounded', 'mystic', 'clinical']
const PRESET_META: Record<PresetKey, { label: string; description: string }> = {
  grounded: {
    label: 'Grounded observer',
    description:
      `Plain, warm, never prescriptive. Like a friend who has noticed something. Closest to the ${BRAND.product} house voice.`,
  },
  mystic: {
    label: 'Mystic-but-practical',
    description:
      `A touch more poetic but still anchored in your entries. Notices rhythm, never predicts. The ${BRAND.product} house voice.`,
  },
  clinical: {
    label: 'Clinical / data',
    description:
      'Stripped, observational. No astrological framing or metaphor. State the pattern as evidence.',
  },
}

interface PreviewResult {
  text: string
  patternLabel: string
  sampleSize: number
}

function deriveInitialSelection(label: string | null, isCustom: boolean): PresetKey | 'custom' {
  if (isCustom) return 'custom'
  if (!label) return 'grounded'
  // Reverse-map preset labels to keys.
  const match = PRESET_ORDER.find((k) => PRESET_META[k].label === label)
  return match ?? 'grounded'
}

/**
 * Lives on /settings. Self-loading — it reads the saved voice and the current
 * pattern count on mount so it can be dropped into the client settings page
 * without threading server props through it.
 */
export function VoicePanel() {
  const [selection, setSelection] = useState<PresetKey | 'custom'>('grounded')
  const [customPrompt, setCustomPrompt] = useState('')
  const [hasAnyPatterns, setHasAnyPatterns] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savedLabel, setSavedLabel] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [settingsRes, statusRes] = await Promise.all([
          fetch('/api/journal/insights/settings', { cache: 'no-store' }),
          fetch('/api/journal/insights/status', { cache: 'no-store' }),
        ])

        if (settingsRes.ok) {
          const json = (await settingsRes.json()) as { voicePrompt: string | null; voiceLabel: string | null }
          if (!cancelled) {
            const isCustom =
              Boolean(json.voicePrompt) &&
              !PRESET_ORDER.some((key) => PRESET_META[key].label === json.voiceLabel)
            setSelection(deriveInitialSelection(json.voiceLabel, isCustom))
            setSavedLabel(json.voiceLabel)
            if (isCustom && json.voicePrompt) setCustomPrompt(json.voicePrompt)
          }
        }

        if (statusRes.ok) {
          const json = (await statusRes.json()) as { total: number }
          if (!cancelled) setHasAnyPatterns((json.total ?? 0) > 0)
        }
      } catch {
        // Non-fatal: the panel still works, it just starts on the default voice.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function buildPayload(): { voiceKey?: PresetKey; voicePrompt?: string; voiceLabel?: string } {
    if (selection === 'custom') {
      const trimmed = customPrompt.trim()
      if (!trimmed) throw new Error('Write a custom voice or pick a preset.')
      return { voicePrompt: trimmed, voiceLabel: 'Custom' }
    }
    return { voiceKey: selection }
  }

  async function runPreview() {
    setError(null)
    setPreview(null)
    setPreviewing(true)
    try {
      const payload = buildPayload()
      const res = await fetch('/api/journal/insights/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as PreviewResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Preview failed')
      setPreview({ text: json.text, patternLabel: json.patternLabel, sampleSize: json.sampleSize })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  async function saveAndApply() {
    setError(null)
    setQueued(false)
    setSaving(true)
    try {
      const payload = buildPayload()
      const putRes = await fetch('/api/journal/insights/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!putRes.ok) {
        const j = (await putRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      const regenRes = await fetch('/api/journal/insights/regenerate', { method: 'POST' })
      if (!regenRes.ok) {
        const j = (await regenRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? 'Queue failed')
      }
      // Regeneration runs in the background; /insights/map polls for it and
      // swaps cards in as they land.
      setSavedLabel(payload.voiceLabel ?? PRESET_META[selection as PresetKey]?.label ?? null)
      setQueued(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const activeMeta = selection === 'custom' ? null : PRESET_META[selection]
  const previewDisabled = !hasAnyPatterns || previewing || saving || loading
  const saveDisabled = !hasAnyPatterns || saving || loading

  return (
    <section className="channel-ai shell-panel px-6 py-6 md:px-8" id="insight-voice">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-leather-400/30 bg-leather-500/12 text-leather-200">
          <PenLine size={18} />
        </div>
        <div>
          <p className="channel-kicker">Voice &amp; tone</p>
          <h2 className="shell-subsection-title mt-1">How {BRAND.product} writes your patterns</h2>
        </div>
      </div>

      <p className="max-w-2xl text-sm leading-7 text-bone-muted">
        Pick a voice once. We use it to write every pattern summary from your actual journal entries. Change it
        whenever — every card regenerates with the new voice in the background.
        {savedLabel ? <span className="text-bone"> Currently {savedLabel}.</span> : null}
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {PRESET_ORDER.map((key) => {
          const meta = PRESET_META[key]
          const active = selection === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelection(key)}
              className={`shell-panel-soft flex h-full flex-col gap-2 rounded-[1rem] border px-4 py-4 text-left transition-colors ${
                active
                  ? 'border-leather-400/60 bg-leather-500/8'
                  : 'border-border/60 bg-stone-950/55 hover:border-leather-400/35'
              }`}
            >
              <span className="channel-kicker">{active ? 'Selected' : 'Voice'}</span>
              <span className="text-[1.05rem] font-semibold text-bone">{meta.label}</span>
              <span className="text-xs leading-6 text-bone-muted">{meta.description}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setSelection('custom')}
          className={`shell-panel-soft flex h-full flex-col gap-2 rounded-[1rem] border px-4 py-4 text-left transition-colors ${
            selection === 'custom'
              ? 'border-leather-400/60 bg-leather-500/8'
              : 'border-border/60 bg-stone-950/55 hover:border-leather-400/35'
          }`}
        >
          <span className="channel-kicker">{selection === 'custom' ? 'Selected' : 'Voice'}</span>
          <span className="text-[1.05rem] font-semibold text-bone">Custom</span>
          <span className="text-xs leading-6 text-bone-muted">
            Write your own instruction. Anything from tone notes to a full style guide.
          </span>
        </button>
      </div>

      {selection === 'custom' ? (
        <div className="mt-4">
          <label className="shell-kicker mb-2 block" htmlFor="custom-voice">
            Custom voice instruction
          </label>
          <textarea
            id="custom-voice"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder="e.g. Plain prose, second-person, never longer than two sentences. Never use astrology jargon."
            className="w-full rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-3 text-sm leading-7 text-bone placeholder:text-bone-muted/50 focus:border-leather-400/60 focus:outline-none"
          />
          <p className="mt-1 text-xs text-bone-muted/55">{customPrompt.length} / 800</p>
        </div>
      ) : (
        <div className="mt-4 rounded-[1rem] border border-border/60 bg-stone-950/40 px-4 py-3 text-sm leading-7 text-bone-muted">
          {activeMeta?.description}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runPreview}
          disabled={previewDisabled}
          className="rounded-xl border border-border/70 bg-stone-950/60 px-5 py-2.5 text-sm font-medium text-bone transition-colors hover:border-leather-400/35 hover:bg-leather-500/8 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {previewing ? 'Synthesising…' : 'Preview on biggest pattern'}
        </button>
        <button
          type="button"
          onClick={saveAndApply}
          disabled={saveDisabled}
          className="rounded-xl border border-leather-400/50 bg-leather-500/35 px-5 py-2.5 text-sm font-medium text-bone shadow-glow transition-colors hover:bg-leather-500/45 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save & apply to all'}
        </button>
        {!hasAnyPatterns && !loading ? (
          <span className="text-xs text-bone-muted/70">
            No patterns yet — write a few journal entries and the preview will activate.
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-[0.75rem] border border-red-500/30 bg-red-500/8 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {queued ? (
        <p className="mt-3 rounded-[0.75rem] border border-moss-500/35 bg-moss-500/10 px-4 py-2 text-sm text-moss-200">
          Saved. Your pattern cards are regenerating —{' '}
          <Link href="/insights/map" className="underline decoration-moss-400/50 underline-offset-4">
            watch them land on Patterns
          </Link>
          .
        </p>
      ) : null}

      {preview ? (
        <article className="mt-5 rounded-[1rem] border border-leather-400/30 bg-leather-500/6 px-5 py-5">
          <header className="flex items-baseline justify-between gap-3">
            <p className="shell-kicker">Preview · {preview.patternLabel}</p>
            <span className="text-xs uppercase tracking-[0.16em] text-bone-muted/55">
              {preview.sampleSize} {preview.sampleSize === 1 ? 'entry' : 'entries'}
            </span>
          </header>
          <p className="mt-3 text-sm leading-7 text-bone">{preview.text}</p>
          <p className="mt-3 text-xs text-bone-muted/55">
            This is what the voice will sound like applied to your biggest pattern. Hit “Save &amp; apply to all”
            to regenerate every card.
          </p>
        </article>
      ) : null}
    </section>
  )
}
