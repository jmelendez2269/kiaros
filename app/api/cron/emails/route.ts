import { NextResponse } from 'next/server'
import { runRetentionEmailCron } from '@/lib/email/send-retention-emails'
import { isRetentionEmailsEnabled } from '@/lib/feature-flags'

export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  if (!isRetentionEmailsEnabled()) {
    return NextResponse.json({ skipped: true, reason: 'retention emails disabled' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kairosplanner.xyz'
  const summary = await runRetentionEmailCron(appUrl)

  return NextResponse.json(summary)
}
