export interface PlanEntry {
  id: string
  kind: 'manual' | 'curriculum'
  title: string
  done: boolean
  meta?: string
  /** Present only for kind: 'curriculum' — needed to call the session complete route. */
  curriculumRef?: {
    planId: string
    weekNumber: number
    sessionOrder: number
  }
}
