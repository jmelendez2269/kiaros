import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCurrentPlannerYear, getNextPlannerYear, getPlannerYearWithOverride } from './planner-year';

describe('Planner Year Calculation', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.PLANNER_YEAR_OVERRIDE;
    delete process.env.PLANNER_YEAR_OVERRIDE;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.PLANNER_YEAR_OVERRIDE = originalEnv;
    } else {
      delete process.env.PLANNER_YEAR_OVERRIDE;
    }
  });

  describe('getCurrentPlannerYear', () => {
    it('returns calendar year before Dec 1', () => {
      // Nov 30, 2026 23:59 ET
      const nov30 = new Date('2026-11-30T23:59:00-05:00');
      expect(getCurrentPlannerYear(nov30)).toBe(2026);
    });

    it('returns calendar year + 1 on Dec 1', () => {
      // Dec 1, 2026 00:00 ET
      const dec1 = new Date('2026-12-01T00:00:00-05:00');
      expect(getCurrentPlannerYear(dec1)).toBe(2027);
    });

    it('returns calendar year + 1 after Dec 1', () => {
      // Dec 15, 2026
      const dec15 = new Date('2026-12-15T12:00:00-05:00');
      expect(getCurrentPlannerYear(dec15)).toBe(2027);
    });

    it('returns calendar year + 1 in late December', () => {
      // Dec 31, 2026
      const dec31 = new Date('2026-12-31T23:59:00-05:00');
      expect(getCurrentPlannerYear(dec31)).toBe(2027);
    });

    it('returns calendar year in January after roll', () => {
      // Jan 1, 2027 (planner year rolled on Dec 1, 2026)
      const jan1 = new Date('2027-01-01T00:00:00-05:00');
      expect(getCurrentPlannerYear(jan1)).toBe(2027);
    });

    it('returns calendar year in mid-year', () => {
      // June 15, 2026
      const june15 = new Date('2026-06-15T12:00:00-04:00'); // EDT
      expect(getCurrentPlannerYear(june15)).toBe(2026);
    });

    it('handles timezone correctly - Dec 1 UTC but Nov 30 ET', () => {
      // Dec 1, 2026 04:00 UTC = Nov 30, 2026 23:00 ET (still Nov 30 in ET)
      const nov30ET = new Date('2026-12-01T04:00:00Z');
      expect(getCurrentPlannerYear(nov30ET)).toBe(2026);
    });

    it('handles timezone correctly - Dec 1 ET', () => {
      // Dec 1, 2026 05:00 UTC = Dec 1, 2026 00:00 ET
      const dec1ET = new Date('2026-12-01T05:00:00Z');
      expect(getCurrentPlannerYear(dec1ET)).toBe(2027);
    });
  });

  describe('getNextPlannerYear', () => {
    it('returns current + 1', () => {
      const nov30 = new Date('2026-11-30T12:00:00-05:00');
      expect(getNextPlannerYear(nov30)).toBe(2027);
    });

    it('returns current + 1 after roll', () => {
      const dec1 = new Date('2026-12-01T00:00:00-05:00');
      expect(getNextPlannerYear(dec1)).toBe(2028);
    });
  });

  describe('getPlannerYearWithOverride', () => {
    it('returns calculated year when no override', () => {
      const nov30 = new Date('2026-11-30T12:00:00-05:00');
      expect(getPlannerYearWithOverride(nov30)).toBe(2026);
    });

    it('returns override value when set', () => {
      process.env.PLANNER_YEAR_OVERRIDE = '2025';
      const nov30 = new Date('2026-11-30T12:00:00-05:00');
      expect(getPlannerYearWithOverride(nov30)).toBe(2025);
    });

    it('returns override value of 2027', () => {
      process.env.PLANNER_YEAR_OVERRIDE = '2027';
      const nov30 = new Date('2026-11-30T12:00:00-05:00');
      expect(getPlannerYearWithOverride(nov30)).toBe(2027);
    });

    it('ignores invalid override', () => {
      process.env.PLANNER_YEAR_OVERRIDE = 'invalid';
      const nov30 = new Date('2026-11-30T12:00:00-05:00');
      expect(getPlannerYearWithOverride(nov30)).toBe(2026);
    });

    it('ignores out-of-range override (too low)', () => {
      process.env.PLANNER_YEAR_OVERRIDE = '1999';
      const nov30 = new Date('2026-11-30T12:00:00-05:00');
      expect(getPlannerYearWithOverride(nov30)).toBe(2026);
    });

    it('ignores out-of-range override (too high)', () => {
      process.env.PLANNER_YEAR_OVERRIDE = '3000';
      const nov30 = new Date('2026-11-30T12:00:00-05:00');
      expect(getPlannerYearWithOverride(nov30)).toBe(2026);
    });
  });

  describe('Edge cases', () => {
    it('handles leap year correctly', () => {
      const feb29 = new Date('2024-02-29T12:00:00-05:00');
      expect(getCurrentPlannerYear(feb29)).toBe(2024);
    });

    it('handles DST transition correctly - spring forward', () => {
      // March 10, 2026 - DST starts
      const march10 = new Date('2026-03-10T12:00:00-04:00'); // EDT starts
      expect(getCurrentPlannerYear(march10)).toBe(2026);
    });

    it('handles DST transition correctly - fall back', () => {
      // Nov 3, 2026 - DST ends
      const nov3 = new Date('2026-11-03T12:00:00-05:00'); // EST resumes
      expect(getCurrentPlannerYear(nov3)).toBe(2026);
    });
  });
});
