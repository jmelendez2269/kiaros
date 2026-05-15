'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { writeOraclePreseed } from '@/lib/oracle/preseed'

interface StelloquyContextValue {
  /** True when the drawer is on-screen. */
  open: boolean
  /** Open the drawer with no preseed (e.g. from ⌘K or the dock). */
  openDrawer: () => void
  /** Close the drawer. */
  closeDrawer: () => void
  /** Toggle. */
  toggleDrawer: () => void
  /** Write a pre-seed prompt to sessionStorage and open the drawer.
   *  OracleConversation consumes the pre-seed on mount and fires it as the
   *  first user message. */
  openWith: (prompt: string) => void
  /** Entitlement — true for Planner+Oracle subscribers. Components use this
   *  to decide between drawer (subscriber) and one-shot inline reading (free). */
  hasOracleAccess: boolean
}

const StelloquyContext = createContext<StelloquyContextValue | null>(null)

interface Props {
  children: ReactNode
  hasOracleAccess: boolean
}

export function StelloquyProvider({ children, hasOracleAccess }: Props) {
  const [open, setOpen] = useState(false)

  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])
  const toggleDrawer = useCallback(() => setOpen((v) => !v), [])
  const openWith = useCallback((prompt: string) => {
    writeOraclePreseed(prompt)
    setOpen(true)
  }, [])

  const value = useMemo<StelloquyContextValue>(
    () => ({ open, openDrawer, closeDrawer, toggleDrawer, openWith, hasOracleAccess }),
    [open, openDrawer, closeDrawer, toggleDrawer, openWith, hasOracleAccess],
  )

  return <StelloquyContext.Provider value={value}>{children}</StelloquyContext.Provider>
}

export function useStelloquy(): StelloquyContextValue {
  const ctx = useContext(StelloquyContext)
  if (!ctx) {
    throw new Error('useStelloquy must be used within <StelloquyProvider>')
  }
  return ctx
}
