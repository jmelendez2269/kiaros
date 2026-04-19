// Admin console types — shared between API routes and client components.

// ─── API Response ──────────────────────────────────────────────────────────────
export type AdminApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Enums (mirror DB enums) ──────────────────────────────────────────────────
export type SourceType =
  | 'youtube_video'
  | 'youtube_channel'
  | 'podcast'
  | 'website'
  | 'book'
  | 'newsletter'
  | 'other'

export type TrustLevel = 'low' | 'medium' | 'high' | 'verified'

export type ImportType =
  | 'youtube_transcript'
  | 'podcast_transcript'
  | 'manual_paste'
  | 'url_scrape'

export type ImportStatus = 'pending' | 'fetched' | 'processed' | 'failed'

export type CardCategory =
  | 'rising_sign'
  | 'house'
  | 'planet'
  | 'transit_timing'
  | 'planner_translation'
  | 'general_framework'

export type CardStatus = 'draft' | 'approved' | 'rejected'

export type PlannerLayer = 'year' | 'month' | 'week' | 'day'

// ─── Row Types (DB returns) ───────────────────────────────────────────────────
export interface AdminSource {
  id: string
  source_name: string
  astrologer_name: string | null
  source_type: SourceType
  url: string | null
  description: string | null
  trust_level: TrustLevel
  active: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export interface AdminImport {
  id: string
  source_id: string | null
  import_type: ImportType
  raw_content: string | null
  cleaned_content: string | null
  url: string | null
  title: string | null
  status: ImportStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AdminCard {
  id: string
  import_id: string | null
  category: CardCategory
  title: string
  summary: string | null
  structured_data: Record<string, unknown>
  usable_copy: string | null
  source_quotes: string[]
  source_refs: string[]
  confidence_score: number | null
  status: CardStatus
  editor_notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface AdminPlannerMapping {
  id: string
  card_id: string
  planner_layer: PlannerLayer
  use_case: string | null
  default_eligible: boolean
  customized_only: boolean
  priority_weight: number
  confidence_override: number | null
  created_at: string
  updated_at: string
}

// ─── Insert/Update Payloads ───────────────────────────────────────────────────
export type CreateSourcePayload = Omit<
  AdminSource,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateSourcePayload = Partial<CreateSourcePayload>

export type CreateImportPayload = Omit<
  AdminImport,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateImportPayload = Partial<CreateImportPayload>

export type CreateCardPayload = Omit<
  AdminCard,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateCardPayload = Partial<CreateCardPayload>

export type CreateMappingPayload = Omit<
  AdminPlannerMapping,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateMappingPayload = Partial<
  Pick<
    AdminPlannerMapping,
    | 'planner_layer'
    | 'use_case'
    | 'default_eligible'
    | 'customized_only'
    | 'priority_weight'
    | 'confidence_override'
  >
>

// ─── Card Generator Output ────────────────────────────────────────────────────
export interface DraftCardOutput {
  category: CardCategory
  title: string
  summary: string
  usable_copy: string
  source_quotes: string[]
  structured_data: Record<string, unknown>
  confidence_score: number
  tags: string[]
}

// ─── Transcript Ingestion ─────────────────────────────────────────────────────
export interface TranscriptResult {
  raw_content: string
  cleaned_content: string
  title: string
}
