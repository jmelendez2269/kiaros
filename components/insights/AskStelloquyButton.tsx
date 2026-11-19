'use client'

import { K } from '@/components/almanac'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'

/** Opens Stelloquy with a question already written, as the Mind map's side panel does. */
export function AskStelloquyButton({ question, children }: { question: string; children: React.ReactNode }) {
  const { openWith } = useStelloquy()
  return (
    <button
      type="button"
      onClick={() => openWith(question)}
      className="rounded-full px-5 py-2.5 text-sm"
      style={{ background: `${K.copper}26`, border: `1px solid ${K.copper}66`, color: K.ink, cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}
