import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { buildPlanPlacementSystemPrompt } from './plan-placement-system-prompt'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { AreaGoalRow } from '@/lib/planner/get-week-goals'

const placementSchema = z.object({
  placements: z
    .array(
      z.object({
        id: z.string().min(1),
        startMinute: z.number().int().min(0).max(1439),
        durationMinutes: z.number().int().min(5).max(600),
        // .nullish() — the model sometimes writes an explicit `null` for an
        // omitted optional field rather than leaving it out entirely.
        rationale: z.string().max(200).nullish(),
      })
    )
    .max(40),
  note: z.string().max(400).nullish(),
})

export type PlacementResult = z.infer<typeof placementSchema>

export interface PlacementTask {
  id: string
  title: string
}

export interface PlacedBlock {
  title: string
  startMinute: number
  durationMinutes: number
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const mm = minutes % 60
  const displayH = h % 12 === 0 ? 12 : h % 12
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${displayH}:${String(mm).padStart(2, '0')} ${suffix}`
}

function describeWindows(windows: EnergyWindow[]): string {
  if (windows.length === 0) return '(energy windows unavailable for this location)'
  return windows
    .map(
      (w) =>
        `${formatTime(w.startMinute)}–${formatTime(w.endMinute)}: ${w.label} (${w.energyType})${w.reason ? ` — ${w.reason}` : ''}`
    )
    .join('\n')
}

function describeExisting(blocks: PlacedBlock[]): string {
  if (blocks.length === 0) return '(nothing placed yet)'
  return blocks
    .map((b) => `${formatTime(b.startMinute)}–${formatTime(b.startMinute + b.durationMinutes)}: ${b.title}`)
    .join('\n')
}

function describeWeekGoals(goals: AreaGoalRow[]): string {
  if (goals.length === 0) return ''
  const list = goals
    .map((g) => `- "${g.title}"${g.target_label ? ` (${g.target_label})` : ''}${g.description ? ` — ${g.description}` : ''}`)
    .join('\n')
  return `\n\nThis week's goals (weigh these when placing — a task that clearly serves one of these deserves a stronger window):\n${list}`
}

export async function suggestPlacements(args: {
  date: string
  windows: EnergyWindow[]
  existing: PlacedBlock[]
  tasks: PlacementTask[]
  weekGoals?: AreaGoalRow[]
}): Promise<PlacementResult> {
  const model = anthropic('claude-sonnet-4-6')

  const prompt = `Date: ${args.date}

Energy windows through the day:
${describeWindows(args.windows)}

Already placed on the grid:
${describeExisting(args.existing)}

Tasks that need a time (place each one):
${args.tasks.map((t) => `- id: ${t.id} — "${t.title}"`).join('\n')}${describeWeekGoals(args.weekGoals ?? [])}`

  const { text } = await generateText({
    model,
    system: buildPlanPlacementSystemPrompt(),
    prompt,
    maxOutputTokens: 2000,
    temperature: 0.3,
    abortSignal: AbortSignal.timeout(50_000),
  })

  const jsonStr = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let raw: unknown
  try {
    raw = JSON.parse(jsonStr)
  } catch {
    throw new Error('Could not read a placement suggestion — please try again.')
  }

  const parsed = placementSchema.parse(raw)

  // Guard against hallucinated ids: only keep placements for tasks we asked about.
  const requestedIds = new Set(args.tasks.map((t) => t.id))
  parsed.placements = parsed.placements.filter((p) => requestedIds.has(p.id))

  return parsed
}
