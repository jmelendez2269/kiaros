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

export type CaptureOption = {
  mode: CaptureMode
  label: string
  insights: boolean
  planner: boolean
  title?: string
}

export function capturePanelCopy(memoryDefaultsEnabled: boolean) {
  if (memoryDefaultsEnabled) {
    const c = journalMemoryCopy.capture
    return {
      rowHelper: c.rowHelper,
      exchangeHelper: c.exchangeHelper,
      threadHelper: c.threadHelper,
    }
  }
  return {
    rowHelper: LEGACY_CAPTURE.rowHelper,
    exchangeHelper: LEGACY_CAPTURE.exchangeHelper,
    threadHelper: LEGACY_CAPTURE.threadHelper,
  }
}

/**
 * Capture choices. With memory defaults on there are two: Save (used across
 * Kairos, like a journal entry) or Save privately. The legacy four-way split
 * remains behind the flag.
 */
export function buildCaptureOptions(memoryDefaultsEnabled: boolean): CaptureOption[] {
  if (memoryDefaultsEnabled) {
    const c = journalMemoryCopy.capture
    return [
      { mode: 'both', label: c.save, insights: true, planner: true, title: c.saveHelper },
      {
        mode: 'save',
        label: c.savePrivately,
        insights: false,
        planner: false,
        title: c.savePrivatelyHelper,
      },
    ]
  }
  return [
    { mode: 'save', label: LEGACY_CAPTURE.justSave, insights: false, planner: false },
    { mode: 'insights', label: LEGACY_CAPTURE.rememberLabel, insights: true, planner: false },
    { mode: 'planner', label: LEGACY_CAPTURE.planner, insights: false, planner: true },
    { mode: 'both', label: LEGACY_CAPTURE.both, insights: true, planner: true },
  ]
}

/** Confirmation line after a capture is saved. */
export function captureSavedLabel(
  memoryDefaultsEnabled: boolean,
  mode: CaptureMode,
  legacyLabel: string,
): string {
  if (!memoryDefaultsEnabled) return legacyLabel
  return mode === 'save'
    ? journalMemoryCopy.capture.savedPrivately
    : journalMemoryCopy.capture.saved
}
