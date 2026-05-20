import Link from 'next/link'
import { Frame, K, Kicker } from '@/components/almanac'
import type { TodayCurriculumResult, TodayCurriculumSession } from '@/lib/today/get-today-curriculum'

interface Props {
  result: TodayCurriculumResult
}

const SESSION_TYPE_LABEL: Record<TodayCurriculumSession['sessionType'], string> = {
  lesson: 'Lesson',
  practice: 'Practice',
  review: 'Review',
  project: 'Project',
}

const SESSION_TYPE_TONE: Record<TodayCurriculumSession['sessionType'], string> = {
  lesson: K.copper,
  practice: K.sage,
  review: K.plum,
  project: K.ember,
}

const STATUS_TONE: Record<TodayCurriculumSession['status'], string> = {
  scheduled: K.copperHi,
  done: K.sage,
  skipped: K.inkSoft,
}

function relativeDay(daysAway: number): string {
  if (daysAway <= 1) return 'tomorrow'
  if (daysAway < 7) return `in ${daysAway} days`
  if (daysAway < 14) return 'next week'
  return `in ${Math.round(daysAway / 7)} weeks`
}

export function TodayCurriculum({ result }: Props) {
  if (result.status === 'none') {
    return (
      <Frame tone="umber" padding={22}>
        <Kicker color={K.copper}>Today&rsquo;s study</Kicker>
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
          No curriculum sessions scheduled. Pick a topic and Kiaros will build a week-by-week
          plan around your year.
        </p>
        <Link
          href="/curriculum"
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
          Start a curriculum →
        </Link>
      </Frame>
    )
  }

  if (result.status === 'upcoming') {
    const s = result.session
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
          <Kicker color={K.copper}>Today&rsquo;s study</Kicker>
          <span
            style={{
              fontFamily: K.fMono,
              fontSize: 10.5,
              color: K.inkSoft,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Next · {relativeDay(result.daysAway)}
          </span>
        </div>
        <SessionRow session={s} muted />
      </Frame>
    )
  }

  // status === 'today'
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
        <Kicker color={K.copper}>Today&rsquo;s study</Kicker>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 9,
            color: K.inkSoft,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {result.sessions.length === 1
            ? '1 session'
            : `${result.sessions.length} sessions`}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {result.sessions.map((s, i) => (
          <SessionRow key={s.id} session={s} first={i === 0} />
        ))}
      </div>
    </Frame>
  )
}

function SessionRow({
  session,
  first,
  muted,
}: {
  session: TodayCurriculumSession
  first?: boolean
  muted?: boolean
}) {
  const tone = SESSION_TYPE_TONE[session.sessionType]
  const statusTone = STATUS_TONE[session.status]

  return (
    <Link
      href={`/curriculum/${session.planId}`}
      style={{
        display: 'block',
        padding: '10px 0',
        borderTop: first ? 'none' : `1px solid ${K.line}`,
        textDecoration: 'none',
        color: 'inherit',
        opacity: muted ? 0.85 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: tone,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {SESSION_TYPE_LABEL[session.sessionType]}
        </span>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkSoft,
            letterSpacing: '0.14em',
          }}
        >
          Wk {session.weekNumber} · {session.estimatedMinutes} min
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: statusTone,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {session.status}
        </span>
      </div>
      <div
        style={{
          marginTop: 5,
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 20,
          color: K.ink,
          lineHeight: 1.25,
        }}
      >
        {session.title}
      </div>
      <div
        style={{
          marginTop: 3,
          fontFamily: K.fBody,
          fontSize: 13,
          color: K.inkDim,
          letterSpacing: '0.02em',
        }}
      >
        {session.curriculumTitle}
      </div>
      {session.description ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: K.fBody,
            fontSize: 13.5,
            color: K.inkSoft,
            lineHeight: 1.5,
          }}
        >
          {session.description}
        </div>
      ) : null}
    </Link>
  )
}
