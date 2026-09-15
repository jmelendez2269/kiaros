import "server-only"
import { Resend } from "resend"
import { createAdminSupabase } from "@/lib/supabase/admin"
import { loadCurrentBlueprint } from "@/lib/blueprint/load"
import { getActiveTransits } from "@/lib/today/get-active-transits"
import { weekAheadEmail, quietSkyEmail } from "@/lib/email/templates"
import {
  groupRetentionEntitlementsByUser,
  isRetentionEmailEligible,
  type RetentionEntitlement,
} from "@/lib/email/retention-eligibility"

const FROM = "Kairos <hello@kairosplanner.xyz>"
const QUIET_SKY_THRESHOLD_DAYS = 7
const WEEK_AHEAD_DEDUPE_DAYS = 6

interface ConsentedUser {
  id: string
  email: string
  display_name: string | null
  word_of_year: string | null
  last_seen_at: string | null
}

export interface RetentionEmailRunSummary {
  weekAheadSent: number
  quietSkySent: number
  errors: string[]
}

function daysAgo(isoDate: string | null): number | null {
  if (!isoDate) return null
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
}

async function buildTransitLine(userId: string): Promise<string> {
  const result = await getActiveTransits(new Date().toISOString().slice(0, 10), userId)
  if (result.status !== "ok") return "your chart is quiet for the moment."

  const top = result.current[0] ?? result.lifetime[0]
  if (!top) return "your chart is quiet for the moment."

  return `right now, ${top.technical.toLowerCase()} — ${top.plain}.`
}

export async function runRetentionEmailCron(appUrl: string): Promise<RetentionEmailRunSummary> {
  const admin = createAdminSupabase()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const summary: RetentionEmailRunSummary = { weekAheadSent: 0, quietSkySent: 0, errors: [] }

  const { data: users, error: usersError } = await admin
    .from("user_profiles")
    .select("id, email, display_name, word_of_year, last_seen_at")
    .eq("marketing_consent", true)
    .not("onboarding_completed_at", "is", null)

  if (usersError) {
    summary.errors.push("Retention recipients could not be loaded.")
    return summary
  }

  const candidates = (users ?? []) as ConsentedUser[]
  if (candidates.length === 0) return summary

  const { data: entitlements, error: entitlementsError } = await admin
    .from("product_entitlements")
    .select("user_id, source, planner_year, oracle_enabled, starts_at, ends_at, status, access_plan")
    .in("user_id", candidates.map((user) => user.id))

  if (entitlementsError) {
    summary.errors.push("Retention recipient eligibility could not be resolved.")
    return summary
  }

  const entitlementsByUser = groupRetentionEntitlementsByUser(
    (entitlements ?? []) as RetentionEntitlement[],
  )

  const asOf = new Date()
  const isMonday = asOf.getUTCDay() === 1
  const today = asOf.toISOString().slice(0, 10)

  for (const user of candidates) {
    if (!isRetentionEmailEligible(entitlementsByUser.get(user.id) ?? [], asOf)) continue

    const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?u=${user.id}`

    try {
      if (isMonday) {
        const { data: recentSend } = await admin
          .from("retention_email_log")
          .select("sent_at")
          .eq("user_id", user.id)
          .eq("email_type", "week_ahead")
          .gte("sent_at", new Date(Date.now() - WEEK_AHEAD_DEDUPE_DAYS * 86_400_000).toISOString())
          .maybeSingle()

        if (!recentSend) {
          const [loaded, transitLine] = await Promise.all([
            loadCurrentBlueprint(user.id),
            buildTransitLine(user.id),
          ])
          const currentWeek = loaded?.blueprint.weeks.find(
            (w) => w.startDate <= today && today <= w.endDate
          )

          const content = weekAheadEmail({
            displayName: user.display_name,
            weekTheme: currentWeek?.theme ?? null,
            transitLine: transitLine.charAt(0).toUpperCase() + transitLine.slice(1),
            wordOfYear: user.word_of_year,
            appUrl,
            unsubscribeUrl,
          })

          await resend.emails.send({ from: FROM, to: user.email, subject: content.subject, text: content.text, html: content.html })
          await admin.from("retention_email_log").insert({ user_id: user.id, email_type: "week_ahead" })
          summary.weekAheadSent += 1
        }
      }

      const inactiveDays = daysAgo(user.last_seen_at)
      if (inactiveDays !== null && inactiveDays >= QUIET_SKY_THRESHOLD_DAYS) {
        const { data: sentSinceAbsence } = await admin
          .from("retention_email_log")
          .select("sent_at")
          .eq("user_id", user.id)
          .eq("email_type", "quiet_sky")
          .gt("sent_at", user.last_seen_at as string)
          .maybeSingle()

        if (!sentSinceAbsence) {
          const transitLine = await buildTransitLine(user.id)
          const content = quietSkyEmail({
            displayName: user.display_name,
            transitLine,
            appUrl,
            unsubscribeUrl,
          })

          await resend.emails.send({ from: FROM, to: user.email, subject: content.subject, text: content.text, html: content.html })
          await admin.from("retention_email_log").insert({ user_id: user.id, email_type: "quiet_sky" })
          summary.quietSkySent += 1
        }
      }
    } catch (error) {
      summary.errors.push(`${user.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return summary
}
