'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type MobileNavOpenContextValue = {
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
}

const MobileNavOpenContext = createContext<MobileNavOpenContextValue | null>(null)

export function MobileNavOpenProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const value = useMemo(
    () => ({ mobileNavOpen, setMobileNavOpen }),
    [mobileNavOpen],
  )
  return <MobileNavOpenContext.Provider value={value}>{children}</MobileNavOpenContext.Provider>
}

export function useMobileNavOpen(): MobileNavOpenContextValue {
  const ctx = useContext(MobileNavOpenContext)
  if (!ctx) {
    throw new Error('useMobileNavOpen must be used within MobileNavOpenProvider')
  }
  return ctx
}
