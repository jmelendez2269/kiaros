'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BRAND } from '@/lib/brand'

const CATEGORIES = [
  { id: 'general', label: 'General feedback' },
  { id: 'feature_request', label: 'Feature request' },
  { id: 'feels_off', label: 'Something feels off with my reading' },
  { id: 'bug', label: 'Bug or technical issue' },
] as const

const FEELS_OFF_SUB = [
  { id: 'generic', label: 'Feels generic — not specific to my chart' },
  { id: 'inaccurate', label: 'Factually inaccurate' },
  { id: 'tradition_mismatch', label: "Doesn't match my tradition / house system" },
  { id: 'other', label: 'Other' },
] as const

type Category = (typeof CATEGORIES)[number]['id']
type FeelsOffSub = (typeof FEELS_OFF_SUB)[number]['id']
type Phase = 'idle' | 'open' | 'submitting' | 'done'

export function FeedbackButton() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('idle')
  const [category, setCategory] = useState<Category | null>(null)
  const [subCategory, setSubCategory] = useState<FeelsOffSub | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function openModal() {
    setCategory(null)
    setSubCategory(null)
    setMessage('')
    setError('')
    setPhase('open')
  }

  function closeModal() {
    setPhase('idle')
  }

  async function handleSubmit() {
    if (!category) {
      setError('Please select a category.')
      return
    }
    setError('')
    setPhase('submitting')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          sub_category: category === 'feels_off' ? subCategory : null,
          message: message.trim() || null,
          page_context: pathname,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setPhase('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setPhase('open')
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={openModal}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-border/60 bg-stone-900/90 px-4 py-2 text-xs font-medium text-bone-muted shadow-lg backdrop-blur-sm transition-colors hover:border-border hover:text-bone"
        aria-label="Give feedback"
      >
        <span className="text-base leading-none">✦</span>
        Feedback
      </button>

      {/* Backdrop */}
      {phase !== 'idle' && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm"
          onClick={closeModal}
          aria-hidden
        />
      )}

      {/* Modal */}
      {phase !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-border/70 bg-stone-950 shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[420px]"
        >
          <div className="px-6 py-6">
            {phase === 'done' ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-2xl">✦</p>
                <p className="font-serif text-xl text-bone">Thank you</p>
                <p className="text-sm leading-relaxed text-bone-muted">
                  Your feedback shapes how {BRAND.product} improves. We read every submission.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-2 rounded-xl border border-border/60 px-5 py-2 text-sm text-bone-muted hover:text-bone"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Header */}
                <div>
                  <p id="feedback-title" className="font-serif text-xl text-bone">Help us improve</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-bone-muted">
                    {BRAND.product} is built on real ephemeris data and AI synthesis. If a reading feels generic, inaccurate, or just off — we want to know. Your feedback directly shapes how we improve the generations.
                  </p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setCategory(c.id); setSubCategory(null) }}
                      className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                        category === c.id
                          ? 'border-leather-400/60 bg-leather-500/15 text-bone'
                          : 'border-border/60 bg-stone-950/50 text-bone-muted hover:border-border hover:text-bone'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Sub-category for feels_off */}
                {category === 'feels_off' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-bone-muted">What feels off?</p>
                    {FEELS_OFF_SUB.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSubCategory(s.id)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                          subCategory === s.id
                            ? 'border-leather-400/60 bg-leather-500/15 text-bone'
                            : 'border-border/60 bg-stone-950/50 text-bone-muted hover:border-border hover:text-bone'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Anything else you'd like us to know? (optional)"
                  className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-sm text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
                />

                {error && <p className="text-xs text-red-300">{error}</p>}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-border/60 py-2.5 text-sm text-bone-muted hover:text-bone"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={phase === 'submitting' || !category}
                    className="flex-1 rounded-xl border border-leather-400/50 bg-leather-500/30 py-2.5 text-sm font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
                  >
                    {phase === 'submitting' ? 'Sending…' : 'Send feedback'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
