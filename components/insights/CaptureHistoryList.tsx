'use client'

import { useState } from 'react'
import type { UIMessage } from 'ai'
import { MessagesSquare } from 'lucide-react'
import { ThreadViewer } from '@/components/oracle/ThreadViewer'

export type OracleCaptureRow = {
  id: string
  captured_text: string
  source_role: string
  include_in_insights: boolean
  include_in_planner: boolean
  created_at: string
  thread_messages: unknown
  tradition: string | null
}

function truncate(value: string, max = 220) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`
}

export function CaptureHistoryList({ captures }: { captures: OracleCaptureRow[] }) {
  const [viewing, setViewing] = useState<OracleCaptureRow | null>(null)

  return (
    <div className="channel-memory mt-5 space-y-3">
      {captures.length > 0 ? (
        captures.map((capture) => {
          const hasThread = Array.isArray(capture.thread_messages) && capture.thread_messages.length > 0
          return (
            <div key={capture.id} className="channel-card px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/55">
                  {new Date(capture.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {capture.include_in_insights ? <span className="channel-pill">Insights</span> : null}
                  {capture.include_in_planner ? <span className="channel-pill">Planner</span> : null}
                  {!capture.include_in_insights && !capture.include_in_planner ? (
                    <span className="shell-pill">Saved</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-bone-muted">{truncate(capture.captured_text, 220)}</p>
              {hasThread ? (
                <button
                  type="button"
                  onClick={() => setViewing(capture)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-stone-950/60 px-3 py-1.5 text-[0.78rem] font-medium text-bone-muted transition-colors hover:border-plum-400/45 hover:text-bone"
                >
                  <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  View conversation
                </button>
              ) : null}
            </div>
          )
        })
      ) : (
        <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-bone-muted">
          No Stelloquy captures yet. In a conversation, highlight the text you want to keep and use Capture, or save the
          full thread to revisit it here.
        </div>
      )}

      {viewing && Array.isArray(viewing.thread_messages) ? (
        <ThreadViewer
          messages={viewing.thread_messages as unknown as UIMessage[]}
          savedAt={viewing.created_at}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </div>
  )
}
