'use client'

import { ArrowRight, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatPatternLabel,
  PATTERN_DISCOVERY_CHECK_EVENT,
  type PatternDiscovery,
} from '@/lib/journal/pattern-discoveries'

type DiscoveryResponse =
  | { success: true; data: { patterns: PatternDiscovery[] } }
  | { success: false; error: string }

const POLL_INTERVAL_MS = 60_000
const DISPLAY_DURATION_MS = 12_000
const STORAGE_PREFIX = 'kairos:seen-pattern-discoveries:v1'

function readSeenPatternIds(storageKey: string): Set<string> | null {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === null) return null
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return null
    return new Set(parsed.filter((value): value is string => typeof value === 'string'))
  } catch {
    return null
  }
}

function storeSeenPatternIds(storageKey: string, seenIds: Set<string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seenIds)))
  } catch {
    // The in-memory set still prevents repeat notifications for this session.
  }
}

export function PatternDiscoveryNotifier({
  scope,
  initialPatternIds,
}: {
  scope: string
  initialPatternIds: string[]
}) {
  const storageKey = `${STORAGE_PREFIX}:${scope}`
  const seenIdsRef = useRef(new Set<string>())
  const [queue, setQueue] = useState<PatternDiscovery[]>([])
  const current = queue[0] ?? null

  const showNext = useCallback(() => {
    setQueue((existing) => existing.slice(1))
  }, [])

  const dismissAll = useCallback(() => {
    setQueue([])
  }, [])

  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(showNext, DISPLAY_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [current, showNext])

  useEffect(() => {
    let cancelled = false
    let checking = false
    let checkAgain = false
    let timer: number | null = null

    const storedIds = readSeenPatternIds(storageKey)
    seenIdsRef.current = storedIds ?? new Set(initialPatternIds)
    if (storedIds === null) storeSeenPatternIds(storageKey, seenIdsRef.current)

    function scheduleNextCheck() {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(checkForDiscoveries, POLL_INTERVAL_MS)
    }

    async function checkForDiscoveries() {
      if (cancelled) return
      if (checking) {
        checkAgain = true
        return
      }
      checking = true

      try {
        const response = await fetch('/api/journal/insights/discoveries', {
          cache: 'no-store',
        })
        if (!response.ok) return

        const result = (await response.json()) as DiscoveryResponse
        if (cancelled || !result.success) return

        const patterns = result.data.patterns
        const unseen = patterns.filter((pattern) => !seenIdsRef.current.has(pattern.id))
        for (const pattern of patterns) seenIdsRef.current.add(pattern.id)
        storeSeenPatternIds(storageKey, seenIdsRef.current)

        if (unseen.length > 0) {
          setQueue((existing) => {
            const queuedIds = new Set(existing.map((pattern) => pattern.id))
            return [
              ...existing,
              ...unseen.filter((pattern) => !queuedIds.has(pattern.id)),
            ]
          })
        }
      } catch {
        // Discovery checks are background-only; a later tick or focus retries.
      } finally {
        checking = false
        if (cancelled) return
        if (checkAgain) {
          checkAgain = false
          void checkForDiscoveries()
        } else {
          scheduleNextCheck()
        }
      }
    }

    function checkWhenVisible() {
      if (document.visibilityState === 'visible') void checkForDiscoveries()
    }

    function syncSeenIds(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) return
      const updated = readSeenPatternIds(storageKey)
      if (!updated) return
      const seen = seenIdsRef.current
      for (const id of updated) seen.add(id)
      seenIdsRef.current = seen
    }

    void checkForDiscoveries()
    window.addEventListener('focus', checkWhenVisible)
    window.addEventListener('online', checkWhenVisible)
    window.addEventListener('storage', syncSeenIds)
    window.addEventListener(PATTERN_DISCOVERY_CHECK_EVENT, checkWhenVisible)
    document.addEventListener('visibilitychange', checkWhenVisible)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('focus', checkWhenVisible)
      window.removeEventListener('online', checkWhenVisible)
      window.removeEventListener('storage', syncSeenIds)
      window.removeEventListener(PATTERN_DISCOVERY_CHECK_EVENT, checkWhenVisible)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [initialPatternIds, storageKey])

  if (!current) return null

  return (
    <PatternDiscoveryToast
      pattern={current}
      onOpen={showNext}
      onDismissAll={dismissAll}
    />
  )
}

function PatternDiscoveryToast({
  pattern,
  onOpen,
  onDismissAll,
}: {
  pattern: PatternDiscovery
  onOpen: () => void
  onDismissAll: () => void
}) {
  const patternLabel = formatPatternLabel(pattern.pattern_type, pattern.pattern_key)
  const patternSummary = pattern.ai_summary ?? pattern.summary

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:right-5 sm:w-[390px]"
    >
      <div className="relative overflow-hidden rounded-[1.4rem] border border-leather-300/40 bg-stone-900/95 px-5 py-5 shadow-[0_22px_70px_rgba(0,0,0,0.5),0_0_35px_hsl(var(--leather-400)/0.14)] backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-leather-400/15 blur-3xl"
        />
        <div className="relative flex gap-4">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-leather-300/35 bg-leather-500/20 text-leather-200 shadow-glow">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-leather-300 motion-reduce:animate-none" />
          </div>

          <div className="min-w-0 flex-1 pr-7">
            <p className="shell-kicker">A new pattern has surfaced</p>
            <h2 className="mt-1.5 font-display text-xl leading-tight text-bone">
              {patternLabel}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-bone-muted">
              {patternSummary}
            </p>
            <p className="mt-2 text-xs text-leather-200/80">
              {pattern.sample_size} entries are beginning to echo one another.
            </p>
            <Link
              href="/insights/map"
              onClick={onOpen}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-leather-300/45 bg-leather-500/20 px-4 text-sm font-medium text-bone transition-colors hover:bg-leather-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-300/70"
            >
              See the pattern
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={onDismissAll}
            aria-label="Dismiss all pattern notifications"
            className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full text-bone-muted transition-colors hover:bg-stone-800 hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-300/70"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}
