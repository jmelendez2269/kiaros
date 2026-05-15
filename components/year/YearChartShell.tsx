'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { YearView } from '@/components/calendar/YearView'
import type { WeekBlueprint, YearEphemeris } from '@/types/blueprint'

interface Props {
  yearEphemeris: YearEphemeris
  weeks: WeekBlueprint[]
}

/**
 * Thin client wrapper around YearView that converts its callback navigation
 * (onMonthClick, onDayClick) into URL-driven view changes on /year. The
 * outer YearViewSwitcher then picks up the new ?view= and renders the
 * Month or Week view.
 */
export function YearChartShell({ yearEphemeris, weeks }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const goMonth = (monthOneIndexed: number) => {
    const m = String(monthOneIndexed).padStart(2, '0')
    startTransition(() => {
      router.replace(`/year?view=month&month=${yearEphemeris.year}-${m}`, { scroll: false })
    })
  }

  const goWeek = (dateIso: string) => {
    startTransition(() => {
      router.replace(`/year?view=week&date=${dateIso}`, { scroll: false })
    })
  }

  return (
    <YearView
      yearEphemeris={yearEphemeris}
      weeks={weeks}
      onMonthClick={goMonth}
      onDayClick={goWeek}
    />
  )
}
