import { NextResponse } from 'next/server'
import { runRetentionEmailCron } from '@/lib/email/send-retention-emails'
import { isRetentionEmailsEnabled } from '@/lib/feature-flags'
import { runSkyCycleEmailCron } from '@/lib/email/send-sky-cycle-emails'
import { todayISO } from '@/lib/today/get-today-context'

export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kairosplanner.xyz'

  // Sky cycle emails are opt-in per member (user_settings.sky_cycle_emails),
  // so they run regardless of the retention flag.
  const skyCycles = await runSkyCycleEmailCron(appUrl, todayISO())

  if (!isRetentionEmailsEnabled()) {
    return NextResponse.json({ skyCycles, retention: { skipped: true, reason: 'retention emails disabled' } })
  }

  const retention = await runRetentionEmailCron(appUrl)
  return NextResponse.json({ skyCycles, retention })
}
