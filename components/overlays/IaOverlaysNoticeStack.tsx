'use client'

import { PatternDiscoveryNotifier } from '@/components/insights/PatternDiscoveryNotifier'
import { ReflectionNotification } from '@/components/reflections/ReflectionNotification'
import { AppNoticeArea } from './AppNoticeArea'

export function IaOverlaysNoticeStack({
  showPatternDiscovery,
  patternScope,
  initialPatternIds,
}: {
  showPatternDiscovery: boolean
  patternScope: string
  initialPatternIds: string[]
}) {
  return (
    <AppNoticeArea>
      <ReflectionNotification placement="notice" />
      {showPatternDiscovery ? (
        <PatternDiscoveryNotifier
          scope={patternScope}
          initialPatternIds={initialPatternIds}
          placement="notice"
        />
      ) : null}
    </AppNoticeArea>
  )
}
