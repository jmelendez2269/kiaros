'use client'

import { useState } from 'react'
import { FeedbackFloatingTrigger, FeedbackModal } from './FeedbackModal'

export function FeedbackButton({ iaOverlaysEnabled = false }: { iaOverlaysEnabled?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <FeedbackFloatingTrigger onClick={() => setOpen(true)} iaOverlaysEnabled={iaOverlaysEnabled} />
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  )
}
