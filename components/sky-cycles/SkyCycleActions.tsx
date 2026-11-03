'use client'

import Link from 'next/link'
import { K } from '@/components/almanac'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import type { SkyCyclePhase } from '@/lib/sky-cycles/types'

const STELLOQUY_LABEL: Record<SkyCyclePhase, string> = {
  upcoming: 'Prepare with Stelloquy',
  active: 'Check in with Stelloquy',
  ended: 'Look back with Stelloquy',
}

export function SkyCycleActions({
  phase,
  stelloquyPrompt,
  journalHref,
}: {
  phase: SkyCyclePhase
  stelloquyPrompt: string
  journalHref: string
}) {
  const { openWith, hasOracleAccess } = useStelloquy()

  function talk() {
    if (hasOracleAccess) {
      openWith(stelloquyPrompt)
      return
    }
    window.location.assign('/oracle')
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <button
        type="button"
        onClick={talk}
        style={{
          fontFamily: K.fMono,
          fontSize: 11,
          letterSpacing: '0.08em',
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid #A98AEF',
          background: 'transparent',
          color: '#A98AEF',
          cursor: 'pointer',
        }}
      >
        {STELLOQUY_LABEL[phase]} →
      </button>
      <Link href={journalHref} style={{ fontSize: 13, color: K.copperHi, textDecoration: 'underline', textUnderlineOffset: 3 }}>
        Write about it
      </Link>
    </div>
  )
}
