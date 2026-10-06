import { journalMemoryCopy } from '@/lib/copy/journal-memory'

export type CaptureMode = 'save' | 'insights' | 'planner' | 'both'

const LEGACY_CAPTURE = {
  rowHelper: 'Save highlighted text for later, insights, planner context, or both.',
  exchangeHelper:
    "Save your prompt and Stelloquy's full reply together — for later, insights, planner context, or both.",
  threadHelper:
    'Save the entire conversation — every prompt and reply — for later, insights, planner context, or both.',
  justSave: 'Just save',
  rememberLabel: 'Insights',
  planner: 'Planner',
  both: 'Both',
} as const

export function capturePanelCopy(memoryDefaultsEnabled: boolean) {
  if (memoryDefaultsEnabled) {
    return journalMemoryCopy.capture
  }
  return {
    rowHelper: LEGACY_CAPTURE.rowHelper,
    exchangeHelper: LEGACY_CAPTURE.exchangeHelper,
    threadHelper: LEGACY_CAPTURE.threadHelper,
    justSave: LEGACY_CAPTURE.justSave,
    remember: LEGACY_CAPTURE.rememberLabel,
    rememberHelper: undefined,
    planner: LEGACY_CAPTURE.planner,
    plannerHelper: undefined,
    both: LEGACY_CAPTURE.both,
    bothHelper: undefined,
  }
}

export function buildCaptureOptions(memoryDefaultsEnabled: boolean) {
  const copy = capturePanelCopy(memoryDefaultsEnabled)
  return [
    { mode: 'save' as const, label: copy.justSave, insights: false, planner: false },
    {
      mode: 'insights' as const,
      label: copy.remember,
      insights: true,
      planner: false,
      title: copy.rememberHelper,
    },
    {
      mode: 'planner' as const,
      label: copy.planner,
      insights: false,
      planner: true,
      title: copy.plannerHelper,
    },
    {
      mode: 'both' as const,
      label: copy.both,
      insights: true,
      planner: true,
      title: copy.bothHelper,
    },
  ]
}
