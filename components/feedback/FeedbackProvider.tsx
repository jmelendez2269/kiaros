'use client'

import { MessageSquareText } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { FeedbackFloatingTrigger, FeedbackModal } from './FeedbackModal'

type FeedbackContextValue = {
  openFeedback: () => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext)
  if (!ctx) {
    throw new Error('useFeedback must be used within FeedbackProvider')
  }
  return ctx
}

export function FeedbackProvider({
  children,
  iaOverlaysEnabled = false,
}: {
  children: ReactNode
  iaOverlaysEnabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const openFeedback = useCallback(() => setOpen(true), [])

  const value = useMemo(() => ({ openFeedback }), [openFeedback])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackFloatingTrigger onClick={openFeedback} iaOverlaysEnabled={iaOverlaysEnabled} />
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </FeedbackContext.Provider>
  )
}
