'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { K } from '@/components/almanac/tokens'

type View = 'year' | 'month' | 'week'

const VIEWS: { key: View; label: string }[] = [
  { key: 'year', label: 'Year' },
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
]

interface Props {
  current: View
}

export function YearViewSwitcher({ current }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const setView = (next: View) => {
    if (next === current) return
    const sp = new URLSearchParams(params.toString())
    if (next === 'year') sp.delete('view')
    else sp.set('view', next)
    const qs = sp.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: K.bg2,
        border: `1px solid ${K.line}`,
        borderRadius: 999,
        padding: 4,
      }}
    >
      {VIEWS.map((v) => {
        const active = v.key === current
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            style={{
              fontFamily: K.fBody,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              cursor: active ? 'default' : 'pointer',
              background: active ? `linear-gradient(180deg, ${K.copper}, ${K.brick})` : 'transparent',
              color: active ? K.bg : K.inkDim,
              fontWeight: active ? 600 : 400,
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
