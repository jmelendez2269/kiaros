import "server-only"
import { createAdminSupabase } from "@/lib/supabase/admin"

export const ORACLE_MONTHLY_MESSAGE_LIMIT = 200

// One-shot inline syntheses for Planner-only users (no Oracle chat
// entitlement). Hit from "Ask Oracle about this" deep-links on the
// dashboard / Sky Portrait — single Claude call, no back-and-forth.
// Tune from `ai_usage` after a few weeks of real traffic.
export const ORACLE_EXPLAIN_MONTHLY_LIMIT = 20

export type AIFeature =
  | "oracle"
  | "oracle_explain"
  | "blueprint"
  | "curriculum"
  | "quarterly_review"
  | "month_brief"
  | "journal_insight"
  | "season_read"

export interface UsageTotals {
  messageCount: number
  inputTokens: number
  inputTokensCached: number
  cacheCreationTokens: number
  outputTokens: number
}

export interface RecordUsageParams {
  userId: string
  feature: AIFeature
  model: string
  messages?: number
  inputTokens?: number
  inputTokensCached?: number
  cacheCreationTokens?: number
  outputTokens?: number
}

function firstOfMonth(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

export async function getMonthlyUsage(
  userProfileId: string,
  feature: AIFeature,
  month: string = firstOfMonth()
): Promise<UsageTotals> {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from("ai_usage")
    .select("message_count, input_tokens, input_tokens_cached, cache_creation_tokens, output_tokens")
    .eq("user_id", userProfileId)
    .eq("period_month", month)
    .eq("feature", feature)

  if (error || !data) {
    return { messageCount: 0, inputTokens: 0, inputTokensCached: 0, cacheCreationTokens: 0, outputTokens: 0 }
  }

  return data.reduce<UsageTotals>(
    (acc, row) => ({
      messageCount: acc.messageCount + (row.message_count ?? 0),
      inputTokens: acc.inputTokens + Number(row.input_tokens ?? 0),
      inputTokensCached: acc.inputTokensCached + Number(row.input_tokens_cached ?? 0),
      cacheCreationTokens: acc.cacheCreationTokens + Number(row.cache_creation_tokens ?? 0),
      outputTokens: acc.outputTokens + Number(row.output_tokens ?? 0),
    }),
    { messageCount: 0, inputTokens: 0, inputTokensCached: 0, cacheCreationTokens: 0, outputTokens: 0 }
  )
}

export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const admin = createAdminSupabase()
  const { error } = await admin.rpc("increment_ai_usage", {
    p_user_id: params.userId,
    p_period_month: firstOfMonth(),
    p_feature: params.feature,
    p_model: params.model,
    p_messages: params.messages ?? 0,
    p_input_tokens: params.inputTokens ?? 0,
    p_input_tokens_cached: params.inputTokensCached ?? 0,
    p_cache_creation_tokens: params.cacheCreationTokens ?? 0,
    p_output_tokens: params.outputTokens ?? 0,
  })

  if (error) {
    console.error("[ai-usage] Failed to record usage:", error.message)
  }
}

export async function getUserProfileId(clerkUserId: string): Promise<string | null> {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle()

  if (error || !data) return null
  return data.id
}
