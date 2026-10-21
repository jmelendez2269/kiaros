import type { MoonDayNudgePhase } from '@/lib/today/moon-day-nudge-copy'

export type MoonDayNudgeViewState = 'hidden' | 'showing' | 'done' | 'dismissed'

export function resolveMoonDayNudgeViewState(args: {
  phase: MoonDayNudgePhase | null
  remindersEnabled: boolean
  dismissed: boolean
  ritualDone: boolean
}): MoonDayNudgeViewState {
  if (!args.phase || !args.remindersEnabled) return 'hidden'
  if (args.dismissed) return 'dismissed'
  if (args.ritualDone) return 'done'
  return 'showing'
}
