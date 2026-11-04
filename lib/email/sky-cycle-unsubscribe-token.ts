import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed one-click unsubscribe for sky cycle emails, so a link can only turn
 * off the emails of the member it was sent to.
 */
function secret(): string {
  const value = process.env.EMAIL_UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET
  if (!value) throw new Error('No unsubscribe signing secret configured')
  return value
}

export function skyCycleUnsubscribeToken(userId: string, signingSecret: string = secret()): string {
  return createHmac('sha256', signingSecret).update(`sky-cycle-emails:${userId}`).digest('base64url')
}

export function verifySkyCycleUnsubscribeToken(
  userId: string,
  token: string,
  signingSecret: string = secret(),
): boolean {
  const expected = Buffer.from(skyCycleUnsubscribeToken(userId, signingSecret))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function skyCycleUnsubscribeUrl(appUrl: string, userId: string): string {
  return `${appUrl}/api/email/sky-cycles/unsubscribe?u=${encodeURIComponent(userId)}&t=${skyCycleUnsubscribeToken(userId)}`
}
