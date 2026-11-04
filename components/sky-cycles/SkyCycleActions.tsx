'use client'

import Link from 'next/link'
import { useState } from 'react'
import { K } from '@/components/almanac'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import type { SkyCyclePhase } from '@/lib/sky-cycles/types'
import { SkyCycleReviewModal } from './SkyCycleReviewModal'

const STELLOQUY_LABEL: Record<SkyCyclePhase, string> = {
  upcoming: 'Prepare with Stelloquy',
  active: 'Check in with Stelloquy',
  ended: 'Look back with Stelloquy',
}

const PILL = {
  fontFamily: K.fMono,
  fontSize: 11,
  letterSpacing: '0.08em',
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px solid #A98AEF',
  cursor: 'pointer',
} as const

export function SkyCycleActions({
  phase,
  stelloquyPrompt,
  journalHref,
  cycleId,
  title,
  subtitle,
}: {
  phase: SkyCyclePhase
  stelloquyPrompt: string
  journalHref: string
  cycleId: string
  title: string
  subtitle: string
}) {
  const { openWith, hasOracleAccess } = useStelloquy()
  const [reviewOpen, setReviewOpen] = useState(false)

  function talk() {
    if (hasOracleAccess) {
      openWith(stelloquyPrompt)
      return
    }
    window.location.assign('/oracle')
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12 }}>
      {phase === 'ended' ? (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          style={{ ...PILL, background: '#A98AEF', color: '#0A0C14' }}
        >
          Read the look back →
        </button>
      ) : (
        <button
          type="button"
          data-sky-close
          onClick={talk}
          style={{ ...PILL, border: `1px solid ${K.stelloBlueSoft}`, background: `${K.stelloBlue}1f`, color: K.stelloBlueSoft }}
        >
          {STELLOQUY_LABEL[phase]} →
        </button>
      )}
      <Link href={journalHref} data-sky-close style={{ fontSize: 13, color: K.copperHi, textDecoration: 'underline', textUnderlineOffset: 3 }}>
        Write about it
      </Link>
      {reviewOpen ? (
        <SkyCycleReviewModal
          cycleId={cycleId}
          title={title}
          subtitle={subtitle}
          stelloquyPrompt={stelloquyPrompt}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}
    </div>
  )
}
