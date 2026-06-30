'use client'

import { useState } from 'react'
import { OracleConversation } from './OracleConversation'
import { StelloquyOrb } from './StelloquyOrb'

const ORACLE_TRADITIONS = [
  { id: 'evolutionary', label: 'Evolutionary' },
  { id: 'karmic', label: 'Karmic' },
  { id: 'psychological', label: 'Psychological' },
  { id: 'traditional', label: 'Traditional' },
  { id: 'synthesis', label: 'Synthesis' },
] as const

type OracleTradition = (typeof ORACLE_TRADITIONS)[number]['id']

interface Props {
  today: string
  userTradition?: string | null
}

/**
 * /oracle page layout — header with 4-tradition tabs, one OracleConversation
 * instance per tab, lazy-mounted and kept alive so history survives tab switches.
 */
export function OracleChat({ today, userTradition }: Props) {
  const defaultTab: OracleTradition =
    (ORACLE_TRADITIONS.find((t) => t.id === userTradition)?.id) ?? 'synthesis'

  const [active, setActive] = useState<OracleTradition>(defaultTab)
  const [mounted, setMounted] = useState<Set<OracleTradition>>(() => new Set([defaultTab]))

  function handleTabClick(id: OracleTradition) {
    setActive(id)
    setMounted((prev) => new Set([...prev, id]))
  }

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

        <div className="mt-5 flex gap-1.5 overflow-x-auto">
          {ORACLE_TRADITIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabClick(t.id)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active === t.id
                  ? 'bg-leather-500/30 text-bone border border-leather-400/50'
                  : 'text-bone-muted border border-border/50 hover:text-bone hover:border-border'
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto shrink-0 self-center text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/50">
            5 lenses
          </span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {ORACLE_TRADITIONS.map((t) =>
          mounted.has(t.id) ? (
            <div
              key={t.id}
              className={`absolute inset-0 flex flex-col ${active === t.id ? '' : 'hidden'}`}
            >
              <OracleConversation
                tradition={t.id}
                className="shell-panel flex min-h-0 flex-1 flex-col px-5 py-5"
              />
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}
