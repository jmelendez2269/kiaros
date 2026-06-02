'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Check, MessagesSquare, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { OracleMessage } from './OracleMessage'
import { OracleInput } from './OracleInput'
import { StelloquyOrb, type OrbState } from './StelloquyOrb'
import { useStelloquy } from './StelloquyProvider'
import { consumeOraclePreseed } from '@/lib/oracle/preseed'

const ROLE_LABEL: Record<string, string> = {
  user: 'YOU',
  assistant: 'STELLOQUY',
  system: 'SYSTEM',
}

const THREAD_MAX_CHARS = 20000

function extractMessageText(message: UIMessage): string {
  const parts = (message as unknown as { parts?: Array<{ type: string; text?: string }> }).parts
  if (Array.isArray(parts)) {
    return parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('')
  }
  const content = (message as unknown as { content?: unknown }).content
  return typeof content === 'string' ? content : ''
}

function formatThread(messages: UIMessage[]): string {
  return messages
    .map((m) => {
      const role = ROLE_LABEL[m.role] ?? m.role.toUpperCase()
      return `${role}:\n${extractMessageText(m).trim()}`
    })
    .join('\n\n---\n\n')
}

type ThreadCaptureMode = 'save' | 'insights' | 'planner' | 'both'
const THREAD_OPTIONS: Array<{ mode: ThreadCaptureMode; label: string; insights: boolean; planner: boolean }> = [
  { mode: 'save', label: 'Just save', insights: false, planner: false },
  { mode: 'insights', label: 'Insights', insights: true, planner: false },
  { mode: 'planner', label: 'Planner', insights: false, planner: true },
  { mode: 'both', label: 'Both', insights: true, planner: true },
]

const SUGGESTED_PROMPTS = [
  'What should I focus on this week?',
  'What patterns are showing up in my journal?',
  'Where is my energy best spent right now?',
]

interface Props {
  /** Tailwind classes for the outer container. Defaults to a flex column
   *  that fills the parent. Pass legacy `shell-panel ...` to match the
   *  /oracle page styling, or a simpler container for the drawer. */
  className?: string
  /** When true (drawer mode), the conversation also shows a small status
   *  orb above the input so users see Stelloquy thinking/speaking without
   *  needing the parent to render its own. Default false (legacy page
   *  renders its own header orb). */
  showStatusOrb?: boolean
}

/**
 * Headless chat body — message list, suggested prompts, thinking indicator,
 * input, capture handling. The legacy /oracle page wraps this in its own
 * shell-panel; StelloquyShell renders it directly inside the drawer.
 *
 * Owning `useChat` here keeps streaming state colocated with the rendering
 * concerns. Parent wrappers that need to reflect chat state (e.g. an
 * external header orb) can opt into `showStatusOrb` instead — it's
 * intentionally not a callback because the only consumer is the body
 * itself.
 */
export function OracleConversation({
  className = 'flex min-h-0 flex-1 flex-col px-5 py-5',
  showStatusOrb = false,
}: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/oracle/chat' }), [])
  const { messages, sendMessage, status, error } = useChat({ transport })
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [showThreadPanel, setShowThreadPanel] = useState(false)
  const [savingThread, setSavingThread] = useState(false)
  const [threadSavedMode, setThreadSavedMode] = useState<ThreadCaptureMode | null>(null)
  const [threadError, setThreadError] = useState<string | null>(null)
  const { preseedNonce } = useStelloquy()
  // Tracks the highest preseed nonce we've already consumed. Initialised to
  // -1 so the initial mount (nonce starts at 0) still fires the effect once
  // for cross-page deep links that wrote a preseed before this component
  // existed. Subsequent openWith() calls bump the nonce and re-fire even
  // when the drawer is already open.
  const lastConsumedNonce = useRef(-1)

  const isLoading = status === 'streaming' || status === 'submitted'
  const lastRole = messages[messages.length - 1]?.role
  const orbState: OrbState =
    status === 'submitted' ? 'thinking' : status === 'streaming' ? 'speaking' : 'listening'

  function handleSend(text: string) {
    setCaptureError(null)
    sendMessage({ text })
  }

  useEffect(() => {
    if (lastConsumedNonce.current >= preseedNonce) return
    const preseed = consumeOraclePreseed()
    if (preseed) {
      lastConsumedNonce.current = preseedNonce
      handleSend(preseed)
    } else {
      // No preseed waiting — still mark this nonce as handled so we don't
      // re-enter on every render. Future openWith calls bump the nonce and
      // re-trigger the effect.
      lastConsumedNonce.current = preseedNonce
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preseedNonce])

  const exchangeCount = useMemo(() => {
    let pairs = 0
    let sawUser = false
    for (const m of messages) {
      if (m.role === 'user') {
        sawUser = true
      } else if (m.role === 'assistant' && sawUser) {
        pairs += 1
        sawUser = false
      }
    }
    return pairs
  }, [messages])

  function openThreadPanel() {
    setShowThreadPanel(true)
    setThreadError(null)
    setThreadSavedMode(null)
  }

  async function saveThread(option: (typeof THREAD_OPTIONS)[number]) {
    if (savingThread || messages.length === 0) return
    const formatted = formatThread(messages)
    const truncated = formatted.length > THREAD_MAX_CHARS
    const body = truncated
      ? `${formatted.slice(0, THREAD_MAX_CHARS - 30)}\n\n[thread truncated]`
      : formatted

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const summary = `Thread of ${exchangeCount} exchange${exchangeCount === 1 ? '' : 's'} saved ${new Date().toISOString().slice(0, 10)}${truncated ? ' (truncated)' : ''}`

    setSavingThread(true)
    setThreadError(null)
    try {
      const response = await fetch('/api/oracle/captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captured_text: body,
          source_message_id: lastAssistant?.id ?? null,
          source_role: 'assistant',
          source_excerpt: summary,
          include_in_insights: option.insights,
          include_in_planner: option.planner,
        }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save thread.')
      }
      setThreadSavedMode(option.mode)
      setShowThreadPanel(false)
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Failed to save thread.')
    } finally {
      setSavingThread(false)
    }
  }

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
    <div className={className}>
      {showStatusOrb ? (
        <div className="mb-3 flex items-center gap-2 px-1 text-[10px] uppercase tracking-widest text-bone-muted/60">
          <StelloquyOrb size={20} state={orbState} ariaLabel={`Stelloquy ${orbState}`} />
          <span>{orbState}</span>
        </div>
      ) : null}

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
          messages.map((message, index) => {
            let precedingUserText: string | undefined
            if (message.role === 'assistant') {
              for (let i = index - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                  const parts = (messages[i] as unknown as { parts?: Array<{ type: string; text?: string }> }).parts
                  const fromParts = Array.isArray(parts)
                    ? parts.filter((p) => p.type === 'text' && typeof p.text === 'string').map((p) => p.text as string).join('')
                    : ''
                  const fromContent = (messages[i] as unknown as { content?: unknown }).content
                  precedingUserText = fromParts || (typeof fromContent === 'string' ? fromContent : '')
                  break
                }
              }
            }
            return (
              <OracleMessage
                key={message.id}
                message={message}
                precedingUserText={precedingUserText}
                onCapture={handleCapture}
              />
            )
          })
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

      {exchangeCount >= 1 ? (
        <div className="mb-2 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {threadSavedMode ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-moss-100">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Thread saved
              </span>
            ) : null}
            <button
              type="button"
              onClick={openThreadPanel}
              disabled={savingThread}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-stone-950/70 px-3 text-[0.72rem] font-medium text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone disabled:opacity-50"
            >
              <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Save full thread ({exchangeCount} {exchangeCount === 1 ? 'exchange' : 'exchanges'})
            </button>
          </div>

          {threadError ? (
            <p className="max-w-md text-right text-xs text-red-300">{threadError}</p>
          ) : null}

          {showThreadPanel ? (
            <div className="w-full max-w-md rounded-xl border border-border/80 bg-stone-950 px-3 py-3 shadow-glow">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs leading-5 text-bone-muted">
                  Save the entire conversation — every prompt and reply — for later, insights, planner context, or both.
                </p>
                <button
                  type="button"
                  onClick={() => setShowThreadPanel(false)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 text-bone-muted hover:text-bone"
                  aria-label="Close thread options"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-bone-muted">
                {messages.length} message{messages.length === 1 ? '' : 's'} ({exchangeCount} exchange{exchangeCount === 1 ? '' : 's'}).
                {formatThread(messages).length > THREAD_MAX_CHARS ? ' Will be truncated at 20,000 characters.' : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {THREAD_OPTIONS.map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    disabled={savingThread}
                    onClick={() => saveThread(option)}
                    className="rounded-lg border border-leather-400/35 bg-leather-500/16 px-3 py-1.5 text-xs font-medium text-bone transition-colors hover:bg-leather-500/24 disabled:opacity-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <OracleInput onSend={handleSend} isLoading={isLoading} />
    </div>
  )
}
