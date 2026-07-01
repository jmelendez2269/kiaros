import Link from 'next/link'
import { Frame, K, Kicker } from '@/components/almanac'
import type { TodayIntentionResult } from '@/lib/today/get-today-intention'

interface Props {
  result: TodayIntentionResult
}

const SOURCE_LABEL: Record<'week' | 'month' | 'quarter' | 'year', string> = {
  week: 'From this week',
  month: 'From this month',
  quarter: 'From this quarter',
  year: 'From your year',
}

export function TodayIntention({ result }: Props) {
  if (result.status === 'no-blueprint') {
    return (
      <Frame tone="umber" padding={22}>
        <Kicker color={K.copper}>Today&rsquo;s intention</Kicker>
        <p
          style={{
            marginTop: 10,
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 16.5,
            color: K.inkDim,
            lineHeight: 1.5,
          }}
        >
          Your blueprint hasn&rsquo;t been generated yet. Once it lands, this card holds a single
          line for the day — pulled from the week&rsquo;s intentions, rotated by weekday.
        </p>
        <Link
          href="/year"
          style={{
            display: 'inline-block',
            marginTop: 12,
            fontFamily: K.fMono,
            fontSize: 11.5,
            color: K.copperHi,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Open the year →
        </Link>
      </Frame>
    )
  }

  const { theme, line, source, context, wordOfYear, weekNumber, quarterNumber } = result.data

  const breadcrumb = [
    weekNumber ? `Week ${weekNumber}` : null,
    quarterNumber ? `Q${quarterNumber}` : null,
    wordOfYear ? `Word: ${wordOfYear}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Frame tone="umber" padding={22}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <Kicker color={K.copper}>Today&rsquo;s intention</Kicker>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkSoft,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {SOURCE_LABEL[source]}
        </span>
      </div>

      <div
        style={{
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 29,
          color: K.ink,
          lineHeight: 1.25,
          textWrap: 'balance',
        }}
      >
        {line}
      </div>

      {theme && theme !== line ? (
        <div
          style={{
            marginTop: 12,
            fontFamily: K.fBody,
            fontSize: 15.5,
            color: K.inkDim,
            lineHeight: 1.55,
          }}
        >
          <span style={{ color: K.copperHi, fontStyle: 'italic' }}>Theme — </span>
          {theme}
        </div>
      ) : null}

      {context ? (
        <div
          style={{
            marginTop: 10,
            fontFamily: K.fBody,
            fontSize: 15,
            color: K.inkSoft,
            lineHeight: 1.55,
          }}
        >
          {context}
        </div>
      ) : null}

      {breadcrumb ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: `1px solid ${K.line}`,
            fontFamily: K.fMono,
            fontSize: 11,
            color: K.inkSoft,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {breadcrumb}
        </div>
      ) : null}
    </Frame>
  )
}
