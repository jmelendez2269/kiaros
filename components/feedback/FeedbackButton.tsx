'use client'

import { useState } from 'react'
import { FeedbackFloatingTrigger, FeedbackModal } from './FeedbackModal'

export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <FeedbackFloatingTrigger onClick={() => setOpen(true)} />
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  )
}
