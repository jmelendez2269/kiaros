import { BRAND } from '@/lib/brand'

export interface RetentionEmailContent {
  subject: string
  text: string
  html: string
}

function wrapHtml(bodyParagraphs: string[], unsubscribeUrl: string): string {
  const paragraphs = bodyParagraphs
    .map((p) => `<p style="margin:0 0 18px;">${p}</p>`)
    .join('\n')
  return `<!doctype html>
<html>
  <body style="background:#12100e;color:#e8e2d8;font-family:Georgia,'Times New Roman',serif;padding:32px 20px;">
    <div style="max-width:480px;margin:0 auto;">
      ${paragraphs}
      <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #3a352e;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8378;">
        <a href="${unsubscribeUrl}" style="color:#8a8378;">Unsubscribe from these notes</a>
      </p>
    </div>
  </body>
</html>`
}

export function weekAheadEmail(input: {
  displayName: string | null
  weekTheme: string | null
  transitLine: string
  wordOfYear: string | null
  appUrl: string
  unsubscribeUrl: string
}): RetentionEmailContent {
  const greeting = input.displayName ? `${input.displayName},` : 'Hello,'
  const themeLine = input.weekTheme
    ? `This week's read: ${input.weekTheme.toLowerCase()}.`
    : `A new week is opening.`
  const wordLine = input.wordOfYear
    ? `You named this year "${input.wordOfYear}" — worth carrying into these seven days.`
    : null

  const paragraphs = [
    greeting,
    themeLine,
    input.transitLine,
    wordLine,
    `Your week is waiting in ${BRAND.product}: ${input.appUrl}/today`,
  ].filter((p): p is string => Boolean(p))

  return {
    subject: input.weekTheme ? `Your week ahead: ${input.weekTheme}` : 'Your week ahead',
    text: paragraphs.join('\n\n') + `\n\n—\nUnsubscribe: ${input.unsubscribeUrl}`,
    html: wrapHtml(paragraphs, input.unsubscribeUrl),
  }
}

export function quietSkyEmail(input: {
  displayName: string | null
  transitLine: string
  appUrl: string
  unsubscribeUrl: string
}): RetentionEmailContent {
  const greeting = input.displayName ? `${input.displayName},` : 'Hello,'

  const paragraphs = [
    greeting,
    `It's been a little while. The sky kept moving regardless — ${input.transitLine}`,
    `No catching up required. Rest counts as part of the year too. Whenever you're ready, today is right here: ${input.appUrl}/today`,
  ]

  return {
    subject: 'The sky, while you were away',
    text: paragraphs.join('\n\n') + `\n\n—\nUnsubscribe: ${input.unsubscribeUrl}`,
    html: wrapHtml(paragraphs, input.unsubscribeUrl),
  }
}
