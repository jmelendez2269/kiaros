import { NextResponse } from 'next/server'
import { runRetentionEmailCron } from '@/lib/email/send-retention-emails'

export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kairosplanner.xyz'
  const summary = await runRetentionEmailCron(appUrl)

  return NextResponse.json(summary)
}
