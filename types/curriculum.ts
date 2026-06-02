export type CurriculumIntensity = 'light' | 'balanced' | 'dense'

export type CurriculumSessionType = 'lesson' | 'practice' | 'review' | 'project'

export interface CurriculumDraftSession {
  title: string
  description: string
  type: CurriculumSessionType
  minutes: number
}

export interface CurriculumDraftWeek {
  weekNumber: number
  theme: string
  goal: string
  deliverable: string
  sessions: CurriculumDraftSession[]
}

export interface CurriculumDraft {
  title: string
  topic: string
  summary: string
  durationWeeks: number
  weeklyHours: number
  intensity: CurriculumIntensity
  objectives: string[]
  outcomes: string[]
  skills: string[]
  weeks: CurriculumDraftWeek[]
}

export interface CurriculumPlanRow {
  id: string
  topic: string
  title: string
  status: 'draft' | 'approved' | 'archived'
  intensity: CurriculumIntensity
  duration_weeks: number
  weekly_hours: number
  objectives: string[]
  outcomes: string[]
  skills: string[]
  curriculum: CurriculumDraft
  summary: string | null
  constraints: string | null
  start_date: string | null
  approved_at: string | null
  created_at: string | null
}

export interface CurriculumSessionExercise {
  prompt: string
  detail?: string | null
}

export interface CurriculumSessionContent {
  body: string
  exercises: CurriculumSessionExercise[]
  reflectionPrompt: string | null
}

export interface CurriculumSessionContentRow extends CurriculumSessionContent {
  id: string
  curriculum_plan_id: string
  week_number: number
  session_order: number
  model: string
  generated_at: string
  updated_at: string
}

export interface CurriculumSessionProgressRow {
  id: string
  curriculum_plan_id: string
  week_number: number
  session_order: number
  completed_at: string | null
  updated_at: string
}

export interface CurriculumSessionRow {
  id: string
  curriculum_plan_id: string
  curriculum_title: string
  week_number: number
  session_order: number
  title: string
  description: string | null
  session_type: CurriculumSessionType
  estimated_minutes: number
  scheduled_for: string
  status: 'scheduled' | 'done' | 'skipped'
}
