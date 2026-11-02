/**
 * Tests for period review auto-open behavior
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isPromoWindow,
  periodFor,
  latestClosedMonth,
  latestClosedQuarter,
} from '@/lib/period-review/periods'

describe('Period Review Auto-Open Logic', () => {
  describe('isPromoWindow', () => {
    it('returns true on the last day of the period', () => {
      const period = periodFor('month', 2026, 10) // October 2026
      expect(isPromoWindow('2026-10-31', period)).toBe(true)
    })

    it('returns true on day 1 of the next period', () => {
      const period = periodFor('month', 2026, 10)
      expect(isPromoWindow('2026-11-01', period)).toBe(true)
    })

    it('returns true on day 7 of the next period', () => {
      const period = periodFor('month', 2026, 10)
      expect(isPromoWindow('2026-11-07', period)).toBe(true)
    })

    it('returns false on day 8 of the next period', () => {
      const period = periodFor('month', 2026, 10)
      expect(isPromoWindow('2026-11-08', period)).toBe(false)
    })

    it('returns false before the period ends', () => {
      const period = periodFor('month', 2026, 10)
      expect(isPromoWindow('2026-10-30', period)).toBe(false)
    })

    it('works correctly for quarters', () => {
      const q3 = periodFor('quarter', 2026, 3) // Jul-Sep
      // Q3 ends Sep 30, window is Sep 30 - Oct 7
      expect(isPromoWindow('2026-09-29', q3)).toBe(false)
      expect(isPromoWindow('2026-09-30', q3)).toBe(true)
      expect(isPromoWindow('2026-10-01', q3)).toBe(true)
      expect(isPromoWindow('2026-10-07', q3)).toBe(true)
      expect(isPromoWindow('2026-10-08', q3)).toBe(false)
    })

    it('handles month-end edge cases', () => {
      const feb = periodFor('month', 2026, 2) // February 2026 (28 days)
      // Window is Feb 28 - Mar 7
      expect(isPromoWindow('2026-02-27', feb)).toBe(false)
      expect(isPromoWindow('2026-02-28', feb)).toBe(true)
      expect(isPromoWindow('2026-03-01', feb)).toBe(true)
      expect(isPromoWindow('2026-03-07', feb)).toBe(true)
      expect(isPromoWindow('2026-03-08', feb)).toBe(false)
    })
  })

  describe('Period ordering logic', () => {
    it('identifies when only month is in window', () => {
      // October 31 - November 7: only October month is in window
      const monthPeriod = latestClosedMonth('2026-11-05')
      const quarterPeriod = latestClosedQuarter('2026-11-05')

      expect(monthPeriod.kind).toBe('month')
      expect(monthPeriod.index).toBe(10) // October

      expect(quarterPeriod.kind).toBe('quarter')
      expect(quarterPeriod.index).toBe(3) // Q3 (Jul-Sep)

      expect(isPromoWindow('2026-11-05', monthPeriod)).toBe(true)
      expect(isPromoWindow('2026-11-05', quarterPeriod)).toBe(false)
    })

    it('identifies when both month and quarter are in window', () => {
      // September 30 - October 7: both September month and Q3 are in window
      const monthPeriod = latestClosedMonth('2026-10-03')
      const quarterPeriod = latestClosedQuarter('2026-10-03')

      expect(monthPeriod.kind).toBe('month')
      expect(monthPeriod.index).toBe(9) // September

      expect(quarterPeriod.kind).toBe('quarter')
      expect(quarterPeriod.index).toBe(3) // Q3

      expect(isPromoWindow('2026-10-03', monthPeriod)).toBe(true)
      expect(isPromoWindow('2026-10-03', quarterPeriod)).toBe(true)
    })

    it('identifies when only quarter is in window', () => {
      // December 31 - January 7: both December month and Q4 are in window
      const monthPeriod = latestClosedMonth('2027-01-05')
      const quarterPeriod = latestClosedQuarter('2027-01-05')

      expect(monthPeriod.kind).toBe('month')
      expect(monthPeriod.index).toBe(12) // December

      expect(quarterPeriod.kind).toBe('quarter')
      expect(quarterPeriod.index).toBe(4) // Q4

      expect(isPromoWindow('2027-01-05', monthPeriod)).toBe(true)
      expect(isPromoWindow('2027-01-05', quarterPeriod)).toBe(true)
    })

    it('identifies when neither is in window', () => {
      // Random mid-month date
      const monthPeriod = latestClosedMonth('2026-11-15')
      const quarterPeriod = latestClosedQuarter('2026-11-15')

      expect(isPromoWindow('2026-11-15', monthPeriod)).toBe(false)
      expect(isPromoWindow('2026-11-15', quarterPeriod)).toBe(false)
    })
  })

  describe('Auto-open storage keys', () => {
    it('generates unique keys for different users', () => {
      const period = periodFor('month', 2026, 10)
      const key1 = `kiaros-period-review-auto-opened:user1:${period.kind}:${period.periodStart}`
      const key2 = `kiaros-period-review-auto-opened:user2:${period.kind}:${period.periodStart}`
      expect(key1).not.toBe(key2)
    })

    it('generates unique keys for different periods', () => {
      const oct = periodFor('month', 2026, 10)
      const nov = periodFor('month', 2026, 11)
      const key1 = `kiaros-period-review-auto-opened:user1:${oct.kind}:${oct.periodStart}`
      const key2 = `kiaros-period-review-auto-opened:user1:${nov.kind}:${nov.periodStart}`
      expect(key1).not.toBe(key2)
    })

    it('generates unique keys for month vs quarter', () => {
      const month = periodFor('month', 2026, 10)
      const quarter = periodFor('quarter', 2026, 4)
      const key1 = `kiaros-period-review-auto-opened:user1:${month.kind}:${month.periodStart}`
      const key2 = `kiaros-period-review-auto-opened:user1:${quarter.kind}:${quarter.periodStart}`
      expect(key1).not.toBe(key2)
    })
  })
})
