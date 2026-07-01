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

function dayLabel(daysAway: number): string {
  if (daysAway === 0) return 'Today'
  if (daysAway === 1) return 'Tomorrow'
  if (daysAway < 7) return `In ${daysAway} days`
  if (daysAway < 14) return 'Next week'
  return `In ${Math.round(daysAway / 7)} weeks`
}

export function TodayCurriculum({ result }: Props) {
  if (result.status === 'none') {
    return (
      <Frame tone="umber" padding={22}>
        <Kicker color={K.copper}>Next study</Kicker>
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

  return (
    <Frame tone="umber" padding={22}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <Kicker color={K.copper}>Next study</Kicker>
        <Link
          href="/curriculum"
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkSoft,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          All sessions →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${result.sessions.length}, minmax(0, 1fr))`, gap: 8 }}>
        {result.sessions.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </div>
    </Frame>
  )
}

function SessionCard({ session }: { session: TodayCurriculumSession }) {
  const typeTone = SESSION_TYPE_TONE[session.sessionType]
  const statusTone = STATUS_TONE[session.status]

  return (
    <Link
      href={`/curriculum/${session.planId}`}
      style={{
        display: 'block',
        background: session.isToday ? `${K.copper}12` : K.bg,
        border: `1px solid ${session.isToday ? K.copper + '44' : K.line}`,
        borderRadius: 12,
        padding: '12px 14px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 120ms',
      }}
    >
      {/* Top row: type + when + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 12,
            color: typeTone,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {SESSION_TYPE_LABEL[session.sessionType]}
        </span>
        <span style={{ fontFamily: K.fMono, fontSize: 12, color: K.line }}>·</span>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 12,
            color: session.isToday ? K.copperHi : K.inkSoft,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: session.isToday ? 600 : 400,
          }}
        >
          {dayLabel(session.daysAway)}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: K.fMono,
            fontSize: 12,
            color: statusTone,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {session.status}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: 8,
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 22,
          color: K.ink,
          lineHeight: 1.25,
        }}
      >
        {session.title}
      </div>

      {/* Curriculum + meta */}
      <div
        style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: K.fBody,
            fontSize: 15,
            color: K.inkDim,
          }}
        >
          {session.curriculumTitle}
        </span>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 12,
            color: K.inkSoft,
            letterSpacing: '0.1em',
          }}
        >
          Wk {session.weekNumber} · {session.estimatedMinutes} min
        </span>
      </div>
    </Link>
  )
}
