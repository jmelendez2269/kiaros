'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, Sparkles, X } from 'lucide-react'
import { useStelloquy } from './StelloquyProvider'

interface Props {
  prompt: string
  hasOracleAccess: boolean
  // Visual label inside the button, e.g. "this placement" → renders
  // "Ask Oracle about this placement". Keep it short. Also used as the
  // overlay header for the free-tier one-shot reading.
  label: string
  // Visual size — tight chip on signal cards, regular button elsewhere.
  size?: 'chip' | 'default'
  // Custom trigger content. When provided, replaces the default "Ask
  // Stelloquy about <label>" chip with whatever the caller renders. The
  // children are wrapped in a transparent button that fires the same flow.
  // Used by SkyBanner et al. to make placement chips themselves clickable.
  children?: React.ReactNode
  // Extra classes appended to the wrapping button when `children` is used.
  // Lets callers make the trigger full-width (e.g. block w-full) or add
  // hover affordances without re-styling AskOracleButton itself.
  triggerClassName?: string
}

type Status = 'idle' | 'streaming' | 'done' | 'error' | 'limit_reached'

export function AskOracleButton({ prompt, hasOracleAccess, label, size = 'default', children, triggerClassName }: Props) {
  const { openWith } = useStelloquy()
  const [status, setStatus] = useState<Status>('idle')
  const [response, setResponse] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [upgradeAvailable, setUpgradeAvailable] = useState(false)
  const [mounted, setMounted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => abortRef.current?.abort()
  }, [])

  // ESC closes the overlay.
  useEffect(() => {
    if (status === 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  function handleClick() {
    if (hasOracleAccess) {
      openWith(prompt)
      return
    }
    void streamExplain()
  }

  async function streamExplain() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('streaming')
    setResponse('')
    setErrorMessage(null)
    setUpgradeAvailable(false)

    try {
      const res = await fetch('/api/oracle/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string
          message?: string
          upgradeAvailable?: boolean
        } | null
        if (payload?.error === 'monthly_limit_reached') {
          setStatus('limit_reached')
          setErrorMessage(payload.message ?? 'Monthly limit reached.')
          setUpgradeAvailable(payload.upgradeAvailable ?? true)
          return
        }
        setStatus('error')
        setErrorMessage(payload?.message || payload?.error || 'Could not reach Stelloquy.')
        return
      }

      if (!res.body) {
        setStatus('error')
        setErrorMessage('No response stream from Stelloquy.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setResponse(accumulated)
      }
      setStatus('done')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    setResponse('')
    setErrorMessage(null)
    setUpgradeAvailable(false)
  }

  const buttonClass =
    size === 'chip'
      ? 'inline-flex items-center gap-1.5 rounded-full border border-leather-400/30 bg-leather-500/10 px-2.5 py-1 text-[11px] font-medium text-leather-200 transition-colors hover:border-leather-400/55 hover:text-bone'
      : 'inline-flex items-center gap-1.5 rounded-full border border-leather-400/35 bg-leather-500/12 px-3 py-1.5 text-xs font-medium text-leather-200 transition-colors hover:border-leather-400/55 hover:text-bone'

  const isOpen = status !== 'idle'

  return (
    <>
      {children ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label={`Ask Stelloquy about ${label}`}
          className={`cursor-pointer border-0 bg-transparent p-0 text-inherit${triggerClassName ? ` ${triggerClassName}` : ''}`}
        >
          {children}
        </button>
      ) : (
        <div className={size === 'chip' ? 'mt-1.5' : 'mt-3'}>
          <button type="button" onClick={handleClick} className={buttonClass}>
            {hasOracleAccess ? <MessageSquare size={12} /> : <Sparkles size={12} />}
            <span>Ask Stelloquy about {label}</span>
          </button>
        </div>
      )}

      {mounted && isOpen
        ? createPortal(
            <OracleOverlay
              status={status}
              response={response}
              errorMessage={errorMessage}
              upgradeAvailable={upgradeAvailable}
              onClose={reset}
              hasOracleAccess={hasOracleAccess}
              label={label}
            />,
            document.body,
          )
        : null}
    </>
  )
}

interface OverlayProps {
  status: Status
  response: string
  errorMessage: string | null
  upgradeAvailable: boolean
  onClose: () => void
  hasOracleAccess: boolean
  label: string
}

function OracleOverlay({
  status,
  response,
  errorMessage,
  upgradeAvailable,
  onClose,
  hasOracleAccess,
  label,
}: OverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4 py-10 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Stelloquy reading on ${label}`}
    >
      <div
        className="absolute inset-0 bg-stone-950/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-leather-400/30 bg-stone-950/95 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-leather-400/20 bg-stone-950/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <p className="shell-eyebrow text-bone-muted/70">Stelloquy reading · one-shot</p>
            <p className="mt-0.5 font-serif text-base text-bone">About {label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-border/70 bg-stone-950/70 p-2 text-bone-muted transition-colors hover:text-bone"
          >
            <X size={14} />
          </button>
        </header>

        <div className="px-6 py-5">
          {status === 'streaming' && response.length === 0 ? (
            <div className="flex items-center gap-1 py-2 text-bone-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-leather-300" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-leather-300 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-leather-300 [animation-delay:300ms]" />
            </div>
          ) : null}

          {response.length > 0 ? (
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-bone">{response}</div>
          ) : null}

          {status === 'error' ? (
            <p className="text-sm leading-6 text-rose-300">{errorMessage}</p>
          ) : null}

          {status === 'limit_reached' ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-bone-muted">{errorMessage}</p>
              {upgradeAvailable ? (
                <a
                  href="/pricing#tiers"
                  className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-sm font-semibold text-stone-950"
                >
                  See Planner + Oracle
                </a>
              ) : null}
            </div>
          ) : null}

          {status === 'done' && !hasOracleAccess ? (
            <div className="mt-5 border-t border-leather-400/20 pt-4">
              <p className="text-sm leading-6 text-bone-muted">
                Want to keep this conversation going? Stelloquy can pick up where this left off — bring follow-up questions, push back on the reading, build it out.
              </p>
              <a
                href="/pricing#tiers"
                className="mt-3 inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-sm font-semibold text-stone-950"
              >
                Continue with Stelloquy →
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
