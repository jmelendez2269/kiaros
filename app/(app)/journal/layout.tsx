import { isIaJournalEnabled } from '@/lib/feature-flags'
import { JournalIaChrome } from '@/components/journal/JournalIaChrome'

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  if (!isIaJournalEnabled()) {
    return children
  }

  return (
    <div className="space-y-6">
      <JournalIaChrome />
      {children}
    </div>
  )
}
