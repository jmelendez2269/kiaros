/**
 * The goal review for the year ahead: each goal is carried as it is,
 * reshaped into new words, or released. Choices are kept apart from the goal
 * itself, so the current year stays exactly as it is until the year turns.
 */

import { getAreaDefinition } from '@/lib/areas'
import { ordinal } from './sky'

export const GOAL_CHOICES = ['carry', 'reshape', 'release'] as const
export type GoalChoice = (typeof GOAL_CHOICES)[number]

export const MAX_RESHAPED_TITLE = 200

export function isGoalChoice(value: unknown): value is GoalChoice {
  return typeof value === 'string' && (GOAL_CHOICES as readonly string[]).includes(value)
}

export interface ReviewGoal {
  id: string
  title: string
  areaName: string
  /** e.g. "Health & Wellness · 6th house", or the area name alone. */
  areaLabel: string
  status: 'active' | 'paused'
  choice: GoalChoice | null
  reshapedTitle: string | null
}

export interface GoalReview {
  year: number
  goals: ReviewGoal[]
  /** False until the table that keeps the choices exists. */
  canSave: boolean
}

export function areaLabel(areaName: string): string {
  const house = getAreaDefinition(areaName).primaryHouses[0]
  return house ? `${areaName} · ${ordinal(house)} house` : areaName
}

/** Validates a save request. Returns the clean value, or an error message for the member. */
export function parseGoalChoice(body: unknown):
  | { ok: true; value: { goalId: string; year: number; choice: GoalChoice; reshapedTitle: string | null } }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request.' }
  const { goalId, year, choice, reshapedTitle } = body as Record<string, unknown>
  if (typeof goalId !== 'string' || !/^[0-9a-f-]{36}$/i.test(goalId)) return { ok: false, error: 'Unknown goal.' }
  if (typeof year !== 'number' || !Number.isInteger(year)) return { ok: false, error: 'Unknown year.' }
  if (!isGoalChoice(choice)) return { ok: false, error: 'Choose carry, reshape or release.' }
  if (choice !== 'reshape') return { ok: true, value: { goalId, year, choice, reshapedTitle: null } }
  const title = typeof reshapedTitle === 'string' ? reshapedTitle.trim() : ''
  if (title.length > MAX_RESHAPED_TITLE) return { ok: false, error: 'That is a little long. Try a shorter line.' }
  return { ok: true, value: { goalId, year, choice, reshapedTitle: title || null } }
}
