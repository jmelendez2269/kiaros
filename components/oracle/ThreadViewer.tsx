'use client'

import type { UIMessage } from 'ai'
import { X } from 'lucide-react'
import { OracleMessage } from './OracleMessage'
import { useStelloquy } from './StelloquyProvider'

interface Props {
  messages: UIMessage[]
  savedAt: string
  onClose: () => void
}

export function ThreadViewer({ messages, savedAt, onClose }: Props) {
  const { openDrawer } = useStelloquy()

  function handleContinue() {
    onClose()
    openDrawer()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="thread-viewer-title"
        className="fixed inset-x-4 top-10 bottom-10 z-50 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/70 bg-stone-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div>
            <p id="thread-viewer-title" className="font-serif text-lg text-bone">
              Saved conversation
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone-muted/55">
              Saved{' '}
              {new Date(savedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 text-bone-muted hover:text-bone"
            aria-label="Close conversation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {messages.map((message) => (
            <OracleMessage key={message.id} message={message} />
          ))}
        </div>

        <div className="border-t border-border/70 px-6 py-4">
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center rounded-xl border border-leather-400/50 bg-leather-500/25 px-4 py-2 text-sm font-medium text-bone transition-colors hover:bg-leather-500/35"
          >
            Continue in Stelloquy
          </button>
          <p className="mt-2 text-xs leading-5 text-bone-muted">
            Opens a fresh conversation in the Stelloquy drawer — this saved thread stays here.
          </p>
        </div>
      </div>
    </>
  )
}
