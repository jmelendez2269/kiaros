'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StatusResponse {
  total: number
  complete: number
  inFlight: number
}

interface Props {
  initialInFlight: number
  children: React.ReactNode
}

const POLL_INTERVAL_MS = 3000
const MAX_POLL_MS = 8 * 60 * 1000 // hard ceiling, just in case

/**
 * Polls /api/journal/insights/status while any pattern row is in-flight,
 * and router.refresh()es the surrounding Server Component on each tick
 * so freshly-synthesised cards land without a full reload. Stops when
 * the server reports zero in-flight rows.
 *
 * Pure wrapper — does not affect layout. Lives between the page and the
 * existing pattern card sections.
 */
export function InsightsPollingShell({ initialInFlight, children }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(
    initialInFlight > 0 ? { total: 0, complete: 0, inFlight: initialInFlight } : null,
  )
  const startedAtRef = useRef<number | null>(initialInFlight > 0 ? Date.now() : null)

  useEffect(() => {
    if (!status || status.inFlight <= 0) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      if (cancelled) return
      try {
        const res = await fetch('/api/journal/insights/status', { cache: 'no-store' })
        if (!res.ok) throw new Error('status failed')
        const next = (await res.json()) as StatusResponse
        if (cancelled) return
        setStatus(next)
        router.refresh()

        const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0
        if (next.inFlight > 0 && elapsed < MAX_POLL_MS) {
          timer = setTimeout(tick, POLL_INTERVAL_MS)
        } else {
          startedAtRef.current = null
        }
      } catch {
        // Network blip — back off one cycle and try again.
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS * 2)
      }
    }

    timer = setTimeout(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [status, router])

  // If the parent says new rows are in-flight (e.g. after Save in
  // VoicePanel triggered a refresh), kick polling back on.
  useEffect(() => {
    if (initialInFlight > 0 && (!status || status.inFlight === 0)) {
      startedAtRef.current = Date.now()
      setStatus({ total: 0, complete: 0, inFlight: initialInFlight })
    }
    // We only want this to react to the server-side count changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInFlight])

  const showBanner = status !== null && status.inFlight > 0

  return (
    <div className="space-y-8">
      {showBanner ? (
        <div className="shell-panel-soft flex items-center gap-3 rounded-[1rem] border border-leather-400/30 bg-leather-500/8 px-5 py-3 text-sm text-bone">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-leather-300" />
          <span>
            Synthesising your patterns in the new voice…
            {status && status.total > 0
              ? ` ${status.complete} of ${status.total} ready.`
              : ''}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  )
}
