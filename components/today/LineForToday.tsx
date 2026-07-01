'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { K, Kicker } from '@/components/almanac'
import { saveLineForToday } from '@/app/(app)/today/actions'

interface Props {
  /** Optional starting streak. Bumps by 1 on a successful save when the user
   *  didn't already have an entry today. */
  streak?: number
}

const TAGS = ['body', 'craft', 'love', 'work', 'rest', 'mind'] as const
type TagKey = (typeof TAGS)[number]

const PROMPT = 'What did the day try to teach me?'

export function LineForToday({ streak = 0 }: Props) {
  const [draft, setDraft] = useState('')
  const [tags, setTags] = useState<TagKey[]>([])
  const [streakNow, setStreakNow] = useState(streak)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function toggleTag(tag: TagKey) {
    setTags((curr) => (curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag]))
  }

  function handleSave() {
    if (!draft.trim() || pending) return
    setError(null)
    startTransition(async () => {
      const result = await saveLineForToday(draft, tags)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft('')
      setTags([])
      setStreakNow((s) => s + 1)
      setSavedFlash(true)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2400)
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSave()
    }
  }

  return (
    <div
      style={{
        background: K.bg3,
        border: `1px solid ${K.brick}55`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Kicker color={K.brickHi}>A line for today</Kicker>
        {streakNow > 0 ? (
          <span
            style={{
              fontFamily: K.fMono,
              fontSize: 10.5,
              color: K.inkSoft,
              letterSpacing: '0.14em',
            }}
          >
            {streakNow}-DAY STREAK
          </span>
        ) : null}
      </div>

      <div
        style={{
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 24,
          color: K.ink,
          marginTop: 8,
          lineHeight: 1.25,
        }}
      >
        {PROMPT}
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a sentence. Tomorrow Stelloquy will fold it into the pattern."
        disabled={pending}
        style={{
          width: '100%',
          marginTop: 12,
          background: K.bg,
          border: `1px solid ${K.line}`,
          borderRadius: 10,
          padding: 14,
          fontFamily: K.fSerif,
          fontSize: 17,
          color: K.ink,
          fontStyle: 'italic',
          lineHeight: 1.6,
          minHeight: 100,
          resize: 'vertical',
          outline: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TAGS.map((tag) => {
            const active = tags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                disabled={pending}
                style={{
                  fontFamily: K.fMono,
                  fontSize: 11,
                  color: active ? K.bg : K.copperHi,
                  background: active ? K.copperHi : 'transparent',
                  border: `1px solid ${K.copper}${active ? 'ff' : '55'}`,
                  borderRadius: 999,
                  padding: '3px 9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: pending ? 'not-allowed' : 'pointer',
                  transition: 'background 120ms, color 120ms, border-color 120ms',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {savedFlash ? (
            <span
              style={{
                fontFamily: K.fMono,
                fontSize: 10.5,
                color: K.sage,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Saved · Stelloquy is listening
            </span>
          ) : null}
          <Link
            href="/journal"
            style={{
              fontFamily: K.fMono,
              fontSize: 10.5,
              color: K.inkSoft,
              letterSpacing: '0.14em',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            Open journal →
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !draft.trim()}
            style={{
              fontFamily: K.fBody,
              fontSize: 13.5,
              color: K.bg,
              background: K.copperHi,
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              cursor: pending || !draft.trim() ? 'not-allowed' : 'pointer',
              opacity: pending || !draft.trim() ? 0.55 : 1,
            }}
          >
            {pending ? 'Saving…' : 'Save line'}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 10,
            fontFamily: K.fBody,
            fontSize: 13.5,
            color: K.brickHi,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}
