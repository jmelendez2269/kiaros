'use client'

import { ArrowRight, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'

interface Props {
  prompt: string
}

export function ContinueWithStelloquy({ prompt }: Props) {
  const router = useRouter()
  const { hasOracleAccess, openWith } = useStelloquy()

  function handleClick() {
    if (hasOracleAccess) {
      openWith(prompt)
      return
    }

    router.push('/oracle')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Continue this intention with Stelloquy"
      className="group ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 font-almanac-mono text-[0.65rem] uppercase tracking-[0.12em] text-almanac-copper-hi transition-colors hover:bg-almanac-kairos/10 hover:text-almanac-starlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almanac-copper/70"
    >
      <MessageSquare aria-hidden size={14} strokeWidth={1.7} />
      <span>Continue with Stelloquy</span>
      <ArrowRight
        aria-hidden
        size={14}
        strokeWidth={1.7}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </button>
  )
}
