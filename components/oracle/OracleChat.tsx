'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo } from 'react'
import { OracleMessage } from './OracleMessage'
import { OracleInput } from './OracleInput'

const SUGGESTED_PROMPTS = [
  'What should I focus on this week?',
  'What does this full moon mean for me?',
  'Where is my energy best spent right now?',
]

interface Props {
  today: string
}

export function OracleChat({ today }: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/oracle/chat' }), [])

  const { messages, sendMessage, status, error } = useChat({ transport })

  const isLoading = status === 'streaming' || status === 'submitted'
  const lastRole = messages[messages.length - 1]?.role

  function handleSend(text: string) {
    sendMessage({ text })
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <div className="shell-panel mb-5 px-6 py-6">
        <p className="shell-kicker mb-3">Oracle</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="shell-section-title">Guidance grounded in your chart and the current sky</h1>
            <p className="mt-3 text-sm leading-7 text-bone-muted">
              Ask about the year, this week, a transit, or how to direct your energy.
            </p>
          </div>
          <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">{today}</div>
        </div>
      </div>

      <div className="shell-panel flex min-h-0 flex-1 flex-col px-5 py-5">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length === 0 ? (
            <div className="space-y-6 pt-12">
              <p className="text-center text-sm text-bone-muted">
                Ask the Oracle anything grounded in your chart, your current transits, or your path this year.
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
            messages.map((message) => <OracleMessage key={message.id} message={message} />)
          )}

          {isLoading && lastRole === 'user' && (
            <div className="flex items-center gap-1 pl-1 text-bone-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leather-300" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leather-300 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leather-300 [animation-delay:300ms]" />
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error.message || 'Something went wrong reaching the Oracle. Try again in a moment.'}
            </div>
          )}
        </div>

        <OracleInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  )
}
