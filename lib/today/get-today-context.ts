import 'server-only'
import {
  getDailyLongitudesForDate,
  getMoonIllumination,
  getLunarPhaseLabel,
  lonToSign,
  lonToDegreeInSign,
  type DailyPlanetLongitudes,
} from '@/lib/ephemeris/astronomia-adapter'
import type { LunarPhase, ZodiacSign } from '@/types/blueprint'
import { getSabianForDegree, formatZodiacPosition, type SabianSymbol } from '@/lib/ephemeris/sabian'

const APP_TIME_ZONE = 'America/New_York'

export interface DayCelestialSnapshot {
  /** YYYY-MM-DD in APP_TIME_ZONE */
  date: string
  /** Sun position */
  sun: { longitude: number; sign: ZodiacSign; degreeInSign: number; positionLabel: string }
  /** Moon position */
  moon: { longitude: number; sign: ZodiacSign; degreeInSign: number; positionLabel: string }
  /** 0–1 lit fraction, for MoonGlyph */
  moonIllumination: number
  /** Qualitative phase label */
  moonPhase: LunarPhase
}

export interface TodayContext {
  today: DayCelestialSnapshot
  /** Today's Sabian symbol, anchored to the Sun's degree. */
  sabian: SabianSymbol
  /** 7-day strip Mon–Sun anchored to the ISO week containing today. */
  week: WeekDay[]
  /** Calendar metadata for the header pill. */
  meta: {
    isoWeek: number
    dayOfYear: number
    longLabel: string // "Thursday, October 22"
  }
}

export interface WeekDay {
  date: string
  shortLabel: string // "M" | "T" ...
  dayNumber: number
  moonIllumination: number
  moonPhase: LunarPhase
  isToday: boolean
}

/** YYYY-MM-DD in APP_TIME_ZONE. */
function todayISO(timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10)
}

function getISOWeek(iso: string): number {
  const date = new Date(`${iso}T12:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getFullYear(), 0, 1))
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.ceil(((current - yearStart.getTime()) / 86400000 + 1) / 7)
}

function dayOfYear(iso: string): number {
  const date = new Date(`${iso}T12:00:00`)
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

function snapshotFromLongitudes(date: string, lon: DailyPlanetLongitudes): DayCelestialSnapshot {
  const sunDeg = lon.sun
  const moonDeg = lon.moon
  return {
    date,
    sun: {
      longitude: sunDeg,
      sign: lonToSign(sunDeg),
      degreeInSign: lonToDegreeInSign(sunDeg),
      positionLabel: formatZodiacPosition(sunDeg + 1),
    },
    moon: {
      longitude: moonDeg,
      sign: lonToSign(moonDeg),
      degreeInSign: lonToDegreeInSign(moonDeg),
      positionLabel: formatZodiacPosition(moonDeg + 1),
    },
    moonIllumination: getMoonIllumination(sunDeg, moonDeg),
    moonPhase: getLunarPhaseLabel(sunDeg, moonDeg),
  }
}

/** Anchor Monday of the ISO week containing `iso`. */
function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const dow = d.getDay() || 7 // Sun=0 → 7
  d.setDate(d.getDate() + 1 - dow)
  return d.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const SHORT_DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

export function getTodayContext(): TodayContext {
  const date = todayISO()
  const longitudes = getDailyLongitudesForDate(date)
  const todaySnap = snapshotFromLongitudes(date, longitudes)
  const sabian = getSabianForDegree(todaySnap.sun.longitude + 1)

  const monday = mondayOf(date)
  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i)
    const dayLon = getDailyLongitudesForDate(day)
    const snap = snapshotFromLongitudes(day, dayLon)
    const dayNum = Number.parseInt(day.slice(-2), 10)
    return {
      date: day,
      shortLabel: SHORT_DOW[i],
      dayNumber: dayNum,
      moonIllumination: snap.moonIllumination,
      moonPhase: snap.moonPhase,
      isToday: day === date,
    }
  })

  const longLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: APP_TIME_ZONE,
  })

  return {
    today: todaySnap,
    sabian,
    week,
    meta: {
      isoWeek: getISOWeek(date),
      dayOfYear: dayOfYear(date),
      longLabel,
    },
  }
}
