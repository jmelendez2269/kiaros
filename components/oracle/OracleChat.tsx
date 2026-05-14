'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { OracleMessage } from './OracleMessage'
import { OracleInput } from './OracleInput'
import { StelloquyOrb, type OrbState } from './StelloquyOrb'
import { consumeOraclePreseed } from '@/lib/oracle/preseed'

const SUGGESTED_PROMPTS = [
  'What should I focus on this week?',
  'What patterns are showing up in my journal?',
  'Where is my energy best spent right now?',
]

interface Props {
  today: string
}

export function OracleChat({ today }: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/oracle/chat' }), [])

  const { messages, sendMessage, status, error } = useChat({ transport })
  const [captureError, setCaptureError] = useState<string | null>(null)
  // Dashboard deep-links write a pre-seed prompt into sessionStorage before
  // navigating here. We dispatch it as the first user message on mount.
  // Ref guards against StrictMode's double-invoke.
  const preseedDispatched = useRef(false)

  const isLoading = status === 'streaming' || status === 'submitted'
  const lastRole = messages[messages.length - 1]?.role

  // Header orb state: thinking while we wait for the first token, speaking while
  // streaming, listening otherwise. Maps to the three orb states from Brand v10 §04.
  const headerOrbState: OrbState =
    status === 'submitted' ? 'thinking' : status === 'streaming' ? 'speaking' : 'listening'

  function handleSend(text: string) {
    setCaptureError(null)
    sendMessage({ text })
  }

  useEffect(() => {
    if (preseedDispatched.current) return
    const preseed = consumeOraclePreseed()
    if (preseed) {
      preseedDispatched.current = true
      handleSend(preseed)
    }
    // We want this to run once on mount; sendMessage identity may change but
    // the dispatched ref makes a repeated effect call a no-op.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCapture(capture: {
    capturedText: string
    sourceMessageId: string
    sourceRole: 'user' | 'assistant' | 'system'
    sourceExcerpt: string
    includeInInsights: boolean
    includeInPlanner: boolean
  }) {
    setCaptureError(null)

    const response = await fetch('/api/oracle/captures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captured_text: capture.capturedText,
        source_message_id: capture.sourceMessageId,
        source_role: capture.sourceRole,
        source_excerpt: capture.sourceExcerpt,
        include_in_insights: capture.includeInInsights,
        include_in_planner: capture.includeInPlanner,
      }),
    })

    const payload = (await response.json()) as { error?: string }
    if (!response.ok) {
      const message = payload.error || 'Failed to save Stelloquy capture.'
      setCaptureError(message)
      throw new Error(message)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <div className="shell-panel mb-5 px-6 py-6">
        <p className="shell-kicker mb-3">Stelloquy · steh-LOH-kwee</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <StelloquyOrb size={64} state={headerOrbState} ariaLabel={`Stelloquy ${headerOrbState}`} />
            <div>
              <h1 className="shell-section-title">A conversation with the stars</h1>
              <p className="mt-2 text-sm leading-7 text-bone-muted">
                Grounded in your chart, this week&apos;s sky, and the journal memory you&apos;ve marked.
              </p>
            </div>
          </div>
          <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">{today}</div>
        </div>
      </div>

      <div className="shell-panel flex min-h-0 flex-1 flex-col px-5 py-5">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length === 0 ? (
            <div className="space-y-6 pt-12">
              <p className="text-center text-sm text-bone-muted">
                Ask Stelloquy anything grounded in your chart, current transits, selected journal memory, or recurring sky patterns.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="rounded-full border border-border/80 bg-stone-950/80 px-4 py-2 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => <OracleMessage key={message.id} message={message} onCapture={handleCapture} />)
          )}

          {isLoading && lastRole === 'user' && (
            <div className="flex items-center gap-2.5 pl-1 text-[10px] uppercase tracking-widest text-bone-muted/60">
              <StelloquyOrb size={28} state="thinking" ariaLabel="Stelloquy is thinking" />
              <span>Thinking</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error.message || 'Something went wrong reaching Stelloquy. Try again in a moment.'}
            </div>
          )}

          {captureError ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {captureError}
            </div>
          ) : null}
        </div>

        <OracleInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  )
}
