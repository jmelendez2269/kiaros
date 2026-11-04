import 'server-only'

import { Resend } from 'resend'
import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  groupRetentionEntitlementsByUser,
  isRetentionEmailEligible,
  type RetentionEntitlement,
} from '@/lib/email/retention-eligibility'
import { skyCycleEmail } from '@/lib/email/sky-cycle-templates'
import { skyCycleUnsubscribeUrl } from '@/lib/email/sky-cycle-unsubscribe-token'
import { selectSkyCycleEmailItems, sentKey } from '@/lib/sky-cycles/email-selection'
import { collectiveCycles, personalCyclesFor } from '@/lib/sky-cycles/load'
import type { NatalChart } from '@/types/blueprint'

const FROM = 'Kairos <hello@kairosplanner.xyz>'

export interface SkyCycleEmailRunSummary {
  recipients: number
  sent: number
  items: number
  skipped?: string
  errors: string[]
}

type Recipient = {
  id: string
  email: string | null
  display_name: string | null
  natal_chart: unknown
}

function asNatalChart(value: unknown): NatalChart | null {
  if (!value || typeof value !== 'object') return null
  const chart = value as Partial<NatalChart>
  return typeof chart.sun?.longitude === 'number' && typeof chart.moon?.longitude === 'number'
    ? (value as NatalChart)
    : null
}

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || /does not exist|could not find/i.test(error.message ?? '')
}

/**
 * Daily: for every member who switched on sky cycle emails, send one email
 * with today's heads-ups and look-back notes. Each cycle is emailed at most
 * once per kind (sky_cycle_email_log).
 */
export async function runSkyCycleEmailCron(appUrl: string, today: string): Promise<SkyCycleEmailRunSummary> {
  const admin = createAdminSupabase()
  const summary: SkyCycleEmailRunSummary = { recipients: 0, sent: 0, items: 0, errors: [] }

  const { data: optedIn, error: settingsError } = await admin
    .from('user_settings')
    .select('user_id')
    .eq('sky_cycle_emails', true)
  if (settingsError) {
    if (isMissingRelation(settingsError)) return { ...summary, skipped: 'migration 0054 not applied' }
    summary.errors.push('Sky cycle email settings could not be loaded.')
    return summary
  }
  const ids = (optedIn ?? []).map((row: { user_id: string }) => row.user_id)
  if (ids.length === 0) return summary

  const [{ data: profiles, error: profilesError }, { data: entitlements, error: entError }] = await Promise.all([
    admin
      .from('user_profiles')
      .select('id, email, display_name, natal_chart')
      .in('id', ids)
      .not('onboarding_completed_at', 'is', null),
    admin
      .from('product_entitlements')
      .select('user_id, source, planner_year, oracle_enabled, starts_at, ends_at, status, access_plan')
      .in('user_id', ids),
  ])
  if (profilesError || entError) {
    summary.errors.push('Sky cycle email recipients could not be loaded.')
    return summary
  }

  const entitlementsByUser = groupRetentionEntitlementsByUser((entitlements ?? []) as RetentionEntitlement[])
  const resend = new Resend(process.env.RESEND_API_KEY)
  const collective = collectiveCycles()
  const asOf = new Date()

  for (const user of (profiles ?? []) as Recipient[]) {
    if (!user.email) continue
    if (!isRetentionEmailEligible(entitlementsByUser.get(user.id) ?? [], asOf)) continue
    summary.recipients += 1

    try {
      const chart = asNatalChart(user.natal_chart)
      const cycles = [...collective, ...(chart ? personalCyclesFor(chart, today) : [])]

      const { data: log, error: logError } = await admin
        .from('sky_cycle_email_log')
        .select('cycle_id, email_kind')
        .eq('user_id', user.id)
        .gte('sent_at', new Date(Date.now() - 400 * 86_400_000).toISOString())
      if (logError) throw new Error('send log unavailable')
      const sent = new Set(
        (log ?? []).map((row: { cycle_id: string; email_kind: 'heads_up' | 'look_back' }) =>
          sentKey(row.cycle_id, row.email_kind),
        ),
      )

      const { headsUps, lookBacks } = selectSkyCycleEmailItems(cycles, today, sent)
      if (headsUps.length + lookBacks.length === 0) continue

      // Claim the rows first: the unique key stops a concurrent run from sending twice.
      const rows = [
        ...headsUps.map((s) => ({ user_id: user.id, cycle_id: s.cycle.id, email_kind: 'heads_up' })),
        ...lookBacks.map((s) => ({ user_id: user.id, cycle_id: s.cycle.id, email_kind: 'look_back' })),
      ]
      const { error: claimError } = await admin.from('sky_cycle_email_log').insert(rows)
      if (claimError) throw new Error('could not record send')

      const content = skyCycleEmail({
        displayName: user.display_name,
        headsUps,
        lookBacks,
        appUrl,
        unsubscribeUrl: skyCycleUnsubscribeUrl(appUrl, user.id),
      })
      const { error: sendError } = await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      })
      if (sendError) {
        // Release the claim so tomorrow's run can retry.
        await admin
          .from('sky_cycle_email_log')
          .delete()
          .eq('user_id', user.id)
          .in('cycle_id', rows.map((r) => r.cycle_id))
          .gte('sent_at', new Date(Date.now() - 3_600_000).toISOString())
        throw new Error(`send failed: ${sendError.message}`)
      }
      summary.sent += 1
      summary.items += rows.length
    } catch (error) {
      summary.errors.push(`${user.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return summary
}
