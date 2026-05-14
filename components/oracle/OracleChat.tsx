'use client'

import { OracleConversation } from './OracleConversation'
import { StelloquyOrb } from './StelloquyOrb'

interface Props {
  today: string
}

/**
 * Legacy /oracle page layout. Wraps the shared OracleConversation in the
 * full-page header + chat-panel chrome. Phase 5 will likely delete the
 * /oracle route — when it goes, this file goes with it and consumers
 * (the Stelloquy drawer) keep using OracleConversation directly.
 */
export function OracleChat({ today }: Props) {
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <div className="shell-panel mb-5 px-6 py-6">
        <p className="shell-kicker mb-3">Stelloquy · steh-LOH-kwee</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <StelloquyOrb size={64} state="listening" ariaLabel="Stelloquy listening" />
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

      <OracleConversation className="shell-panel flex min-h-0 flex-1 flex-col px-5 py-5" />
    </div>
  )
}
