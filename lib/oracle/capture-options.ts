import { journalMemoryCopy } from '@/lib/copy/journal-memory'

export type CaptureMode = 'save' | 'insights' | 'planner' | 'both'

export const CAPTURE_OPTIONS: Array<{
  mode: CaptureMode
  label: string
  insights: boolean
  planner: boolean
  title?: string
}> = [
  { mode: 'save', label: journalMemoryCopy.capture.justSave, insights: false, planner: false },
  {
    mode: 'insights',
    label: journalMemoryCopy.capture.remember,
    insights: true,
    planner: false,
    title: journalMemoryCopy.capture.rememberHelper,
  },
  {
    mode: 'planner',
    label: journalMemoryCopy.capture.planner,
    insights: false,
    planner: true,
    title: journalMemoryCopy.capture.plannerHelper,
  },
  {
    mode: 'both',
    label: journalMemoryCopy.capture.both,
    insights: true,
    planner: true,
    title: journalMemoryCopy.capture.bothHelper,
  },
]
