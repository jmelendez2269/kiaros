'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
import { PeriodReviewModal } from './PeriodReviewModal'

export type PeriodReviewOpenOptions = {
  autoGenerate?: boolean
}

type PeriodReviewContextValue = {
  openPeriodReview: (kind: PeriodReviewKind, year: number, index: number, opts?: PeriodReviewOpenOptions) => void
  closePeriodReview: () => void
  isOpen: boolean
  statusNonce: number
}

const PeriodReviewContext = createContext<PeriodReviewContextValue | null>(null)

export function usePeriodReview(): PeriodReviewContextValue {
  const ctx = useContext(PeriodReviewContext)
  if (!ctx) {
    throw new Error('usePeriodReview must be used within PeriodReviewProvider')
  }
  return ctx
}

export function PeriodReviewProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<PeriodReviewKind>('month')
  const [year, setYear] = useState(new Date().getFullYear())
  const [index, setIndex] = useState(1)
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [statusNonce, setStatusNonce] = useState(0)

  const openPeriodReview = useCallback(
    (k: PeriodReviewKind, y: number, i: number, opts?: PeriodReviewOpenOptions) => {
      setKind(k)
      setYear(y)
      setIndex(i)
      setAutoGenerate(Boolean(opts?.autoGenerate))
      setOpen(true)
    },
    [],
  )

  const closePeriodReview = useCallback(() => {
    setOpen(false)
    setAutoGenerate(false)
    setStatusNonce((n) => n + 1)
  }, [])

  const period = useMemo(() => periodFor(kind, year, index), [kind, year, index])

  const value = useMemo(
    () => ({ openPeriodReview, closePeriodReview, isOpen: open, statusNonce }),
    [openPeriodReview, closePeriodReview, open, statusNonce],
  )

  return (
    <PeriodReviewContext.Provider value={value}>
      {children}
      {open ? (
        <PeriodReviewModal period={period} autoGenerate={autoGenerate} onClose={closePeriodReview} />
      ) : null}
    </PeriodReviewContext.Provider>
  )
}

export function PeriodReviewDeepLink({
  kind,
  year,
  index,
}: {
  kind: PeriodReviewKind
  year: number
  index: number
}) {
  const { openPeriodReview } = usePeriodReview()
  const opened = useRef(false)

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    openPeriodReview(kind, year, index, { autoGenerate: true })
  }, [kind, year, index, openPeriodReview])

  return null
}
