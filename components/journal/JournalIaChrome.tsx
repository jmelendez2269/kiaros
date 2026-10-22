import { Suspense } from 'react'
import { JournalTabs } from '@/components/journal/JournalTabs'

export function JournalIaChrome() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="shell-hero-title">Journal</h1>
      </div>
      <Suspense fallback={null}>
        <JournalTabs />
      </Suspense>
    </div>
  )
}
