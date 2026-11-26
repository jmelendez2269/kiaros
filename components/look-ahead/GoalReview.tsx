'use client'

import Link from 'next/link'
import { useState } from 'react'
import { K, Kicker } from '@/components/almanac'
import { MAX_RESHAPED_TITLE, type GoalChoice, type GoalReview as GoalReviewData, type ReviewGoal } from '@/lib/look-ahead/goals'

const CHOICES: Array<{ value: GoalChoice; label: string }> = [
  { value: 'carry', label: 'Carry' },
  { value: 'reshape', label: 'Reshape' },
  { value: 'release', label: 'Release' },
]

const mono = { fontFamily: K.fMono, letterSpacing: '0.14em', textTransform: 'uppercase' } as const

interface RowState {
  choice: GoalChoice | null
  saved: string | null
  draft: string
  saving: boolean
  error: string | null
  editing: boolean
}

function GoalRow({ goal, year, canSave, mockToday }: { goal: ReviewGoal; year: number; canSave: boolean; mockToday: string | null }) {
  const [state, setState] = useState<RowState>({
    choice: goal.choice,
    saved: goal.reshapedTitle,
    draft: goal.reshapedTitle ?? goal.title,
    saving: false,
    error: null,
    editing: false,
  })

  async function save(choice: GoalChoice, reshapedTitle: string | null) {
    setState((s) => ({ ...s, saving: true, error: null }))
    try {
      const res = await fetch('/api/look-ahead/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, year, choice, reshapedTitle, mockToday }),
      })
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(json?.error ?? 'Your choice could not be saved just now. Please try again.')
      setState((s) => ({ ...s, choice, saved: reshapedTitle, saving: false, editing: false }))
    } catch (err) {
      setState((s) => ({ ...s, saving: false, error: err instanceof Error ? err.message : 'Your choice could not be saved.' }))
    }
  }

  function pick(choice: GoalChoice) {
    if (!canSave || state.saving) return
    if (choice === 'reshape') {
      setState((s) => ({ ...s, editing: true, error: null }))
      return
    }
    void save(choice, null)
  }

  const shown = state.editing ? 'reshape' : state.choice
  return (
    <div className="grid gap-2.5 py-3.5" style={{ borderTop: `1px solid ${K.line}` }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-col gap-0.5" style={{ flex: '1 1 240px' }}>
          <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 20, lineHeight: 1.3, opacity: state.choice === 'release' ? 0.6 : 1 }}>
            “{state.choice === 'reshape' && state.saved ? state.saved : goal.title}”
          </span>
          <span style={{ fontSize: 12.5, color: K.inkDim }}>
            {goal.areaLabel}
            {goal.status === 'paused' ? ' · paused' : ''}
            {state.choice === 'reshape' && state.saved ? ` · was “${goal.title}”` : ''}
          </span>
        </div>
        <div role="group" aria-label={`What happens to “${goal.title}” in ${year}`} className="flex gap-1 rounded-full p-1"
          style={{ background: K.bg3, border: `1px solid ${K.line}` }}>
          {CHOICES.map((c) => {
            const on = shown === c.value
            return (
              <button key={c.value} type="button" aria-pressed={on} disabled={!canSave || state.saving} onClick={() => pick(c.value)}
                className="rounded-full px-3.5 text-[13.5px] disabled:cursor-not-allowed"
                style={{ minHeight: 44, border: 0, background: on ? K.bg4 : 'transparent', color: on ? K.ink : K.inkDim, fontFamily: K.fBody, opacity: !canSave ? 0.6 : 1 }}>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {state.editing ? (
        <form className="flex flex-wrap items-center gap-2.5" onSubmit={(e) => { e.preventDefault(); void save('reshape', state.draft.trim() || null) }}>
          <label className="sr-only" htmlFor={`reshape-${goal.id}`}>The goal in new words</label>
          <input id={`reshape-${goal.id}`} value={state.draft} maxLength={MAX_RESHAPED_TITLE} autoFocus
            onChange={(e) => setState((s) => ({ ...s, draft: e.target.value }))}
            className="min-w-0 flex-1 rounded-lg px-3"
            style={{ minHeight: 44, flexBasis: 240, background: K.bg3, border: `1px solid ${K.borderStrong}`, color: K.ink, fontFamily: K.fBody, fontSize: 14.5 }} />
          <button type="submit" disabled={state.saving} className="rounded-full px-4 text-sm font-medium"
            style={{ minHeight: 44, border: 0, background: K.copperHi, color: K.bg }}>
            {state.saving ? 'Saving' : 'Keep these words →'}
          </button>
          <button type="button" onClick={() => setState((s) => ({ ...s, editing: false }))} className="rounded-full px-3 text-sm"
            style={{ minHeight: 44, border: 0, background: 'transparent', color: K.inkDim }}>
            Not now
          </button>
        </form>
      ) : null}

      {state.error ? <p role="alert" style={{ margin: 0, fontSize: 13, color: K.ember }}>{state.error}</p> : null}
    </div>
  )
}

/** Step 1 of the year ahead: each goal is carried, reshaped or released. Nothing changes in the current year. */
export function GoalReview({ review, mockToday }: { review: GoalReviewData; mockToday: string | null }) {
  return (
    <section aria-label="What comes with you" className="flex min-w-0 flex-col gap-3.5 rounded-2xl p-5 sm:p-6"
      style={{ border: `1px solid ${K.sage}66`, background: K.bg2, color: K.ink }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <Kicker color={K.stelloBlueSoft}>What comes with you</Kicker>
        <span style={{ ...mono, fontSize: 10.5, color: K.inkDim }}>Your goals, in your words</span>
      </div>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: K.inkDim }}>
        Your journal, captures and patterns come with you untouched. Goals are the one thing worth a second look. Letting one go is a complete answer.
      </p>
      {!review.canSave ? (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: K.ember }}>
          Choices can’t be saved just yet. You can look through your goals now and come back to choose.
        </p>
      ) : null}
      {review.goals.length ? (
        review.goals.map((goal) => <GoalRow key={goal.id} goal={goal} year={review.year} canSave={review.canSave} mockToday={mockToday} />)
      ) : (
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65 }}>
          You have no open goals right now, so there is nothing to sort. {review.year} can begin from an open page.{' '}
          <Link href="/areas" className="underline underline-offset-4" style={{ color: K.copperHi }}>Your life areas →</Link>
        </p>
      )}
    </section>
  )
}
