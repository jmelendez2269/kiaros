'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { K } from '@/components/almanac/tokens'

const STORAGE_KEY = 'kiaros-deeper-today-opened'

/**
 * Collapses the "go deeper" section of Today (year arc, life arc, Jupiter
 * season) behind a click for a new account's first week — nothing hidden
 * or locked, just a quieter default landing. Opening it once remembers
 * that choice for this browser forever.
 */
export function DeeperToday({ defaultOpen, children }: { defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!defaultOpen && window.localStorage.getItem(STORAGE_KEY) === '1') {
      setOpen(true)
    }
  }, [defaultOpen])

  function handleOpen() {
    setOpen(true)
    window.localStorage.setItem(STORAGE_KEY, '1')
  }

  if (open) return <>{children}</>

  return (
    <button
      type="button"
      onClick={handleOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '16px 20px',
        borderRadius: 16,
        border: `1px solid ${K.line}`,
        background: K.bg2,
        color: K.inkDim,
        fontFamily: K.fBody,
        fontSize: 14.5,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <ChevronRight size={16} color={K.copper} />
      <span>Go deeper into today &mdash; the year arc, your life arc, and the season you&rsquo;re in</span>
      <ChevronDown size={14} color={K.inkSoft} style={{ marginLeft: 'auto', opacity: 0.5 }} />
    </button>
  )
}
