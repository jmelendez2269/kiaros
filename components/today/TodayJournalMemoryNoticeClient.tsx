'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { JournalMemoryModePrompt } from '@/components/journal/JournalMemoryModePrompt'

export function TodayJournalMemoryNoticeClient({
  hasOracleAccess,
  hasPastEntries,
}: {
  hasOracleAccess: boolean
  hasPastEntries: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <JournalMemoryModePrompt
      hasOracleAccess={hasOracleAccess}
      hasPastEntries={hasPastEntries}
      onComplete={() => {
        setOpen(false)
        router.refresh()
      }}
    />
  )
}
