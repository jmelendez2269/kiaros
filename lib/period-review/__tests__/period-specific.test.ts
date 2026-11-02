/**
 * Tests for period-specific review features
 * Run: npx tsx --test lib/period-review/__tests__/period-specific.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeSkyForPeriod } from '@/lib/period-review/sky-for-period'
import type { YearEphemeris } from '@/types/blueprint'
import { periodFor } from '@/lib/period-review/periods'
import { assemblePeriodReviewUserPrompt, assemblePeriodReviewSystemPrompt } from '@/lib/ai/period-review-system-prompt'
import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'

const mockEphemeris: YearEphemeris = {
  userId: 'test-user',
  year: 2026,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  days: [
    {
      date: '2026-10-01',
      sun: { longitude: 187.5, sign: 'Libra', degree: 7.5 },
      moon: { longitude: 45.0, sign: 'Taurus', degree: 15.0, lunarPhase: 'waxing-gibbous', illumination: 0.75 },
      transits: [],
      retrogrades: [],
    },
    {
      date: '2026-10-15',
      sun: { longitude: 201.0, sign: 'Libra', degree: 21.0 },
      moon: { longitude: 90.0, sign: 'Cancer', degree: 0.0, lunarPhase: 'new', illumination: 0.05 },
      transits: [],
      retrogrades: [],
    },
    {
      date: '2026-10-23',
      sun: { longitude: 210.0, sign: 'Scorpio', degree: 0.0 },
      moon: { longitude: 120.0, sign: 'Leo', degree: 0.0, lunarPhase: 'first-quarter', illumination: 0.5 },
      transits: [],
      retrogrades: [],
    },
    {
      date: '2026-10-31',
      sun: { longitude: 218.0, sign: 'Scorpio', degree: 8.0 },
      moon: { longitude: 150.0, sign: 'Virgo', degree: 0.0, lunarPhase: 'waning-gibbous', illumination: 0.85 },
      transits: [],
      retrogrades: [],
    },
  ],
  moonPhases: [
    { date: '2026-10-15', phase: 'new', time: '12:00', sign: 'Libra', longitude: 195.0 },
    { date: '2026-10-23', phase: 'first-quarter', time: '18:00', sign: 'Capricorn', longitude: 210.0 },
  ],
  retrogradePeriods: [],
  significantTransits: [],
}

describe('Period Review: Ingresses', () => {
  it('includes ingresses in sky summary', () => {
    const period = periodFor('month', 2026, 10)
    const sky = summarizeSkyForPeriod(mockEphemeris, period)

    // Ingresses will be computed from ephemeris days
    assert.ok(sky.ingresses)
    assert.ok(Array.isArray(sky.ingresses))
  })

  it('formats ingresses with dates in user prompt', () => {
    const mockSky = {
      moonPhases: [],
      retrogradePeriods: [],
      significantTransits: [],
      ingresses: [
        { planet: 'Sun' as const, sign: 'Scorpio', date: '2026-10-23' },
        { planet: 'Mercury' as const, sign: 'Scorpio', date: '2026-10-18' },
      ],
      eclipseCount: 0,
      signChangeCount: 2,
      text: 'Quiet period',
    }

    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: mockSky,
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 0,
      checkIns: [],
      goalsActive: 0,
      goalsCompletedInPeriod: 0,
      goalsCompletedApproximate: false,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(prompt.includes('Ingresses (planet sign changes):'))
    assert.ok(prompt.includes('2026-10-23: Sun → Scorpio'))
    assert.ok(prompt.includes('2026-10-18: Mercury → Scorpio'))
  })
})

describe('Period Review: System Prompt', () => {
  it('includes ingress instruction in system prompt', () => {
    const systemPrompt = assemblePeriodReviewSystemPrompt()
    assert.ok(systemPrompt.includes('ingresses'))
    assert.ok(systemPrompt.includes('pattern, not prophecy'))
    assert.ok(systemPrompt.includes('No causal language'))
  })

  it('preserves Stella rules unchanged', () => {
    const systemPrompt = assemblePeriodReviewSystemPrompt()
    assert.ok(systemPrompt.includes('You are Stella'))
    assert.ok(systemPrompt.includes('Pattern, not prophecy'))
    assert.ok(systemPrompt.includes('No authority'))
  })
})

describe('Period Review: Check-ins', () => {
  it('includes check-in mood and energy in user prompt', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: { moonPhases: [], retrogradePeriods: [], significantTransits: [], ingresses: [], eclipseCount: 0, signChangeCount: 0, text: 'Quiet sky' },
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 5,
      checkIns: [
        { date: '2026-10-01', mood: 'calm', energy: 7 },
        { date: '2026-10-05', mood: 'excited', energy: 9 },
        { date: '2026-10-10', mood: null, energy: 5 },
      ],
      goalsActive: 0,
      goalsCompletedInPeriod: 0,
      goalsCompletedApproximate: false,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(prompt.includes('Check-ins:'))
    assert.ok(prompt.includes('2026-10-01, mood: calm, energy: 7'))
    assert.ok(prompt.includes('2026-10-05, mood: excited, energy: 9'))
    assert.ok(prompt.includes('2026-10-10, energy: 5'))
  })

  it('shows "(none)" when no check-ins exist', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: { moonPhases: [], retrogradePeriods: [], significantTransits: [], ingresses: [], eclipseCount: 0, signChangeCount: 0, text: 'Quiet sky' },
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 0,
      checkIns: [],
      goalsActive: 0,
      goalsCompletedInPeriod: 0,
      goalsCompletedApproximate: false,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(prompt.includes('Check-ins:'))
    assert.ok(prompt.includes('(none)'))
  })
})

describe('Period Review: Intentions', () => {
  it('includes intentions in user prompt when present', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: { moonPhases: [], retrogradePeriods: [], significantTransits: [], ingresses: [], eclipseCount: 0, signChangeCount: 0, text: 'Quiet sky' },
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 0,
      checkIns: [],
      goalsActive: 0,
      goalsCompletedInPeriod: 0,
      goalsCompletedApproximate: false,
      intentions: [
        'Focus on creative projects',
        'Reconnect with old friends',
        'Practice daily meditation',
      ],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(prompt.includes('Intentions set during period:'))
    assert.ok(prompt.includes('1. Focus on creative projects'))
    assert.ok(prompt.includes('2. Reconnect with old friends'))
    assert.ok(prompt.includes('3. Practice daily meditation'))
  })

  it('omits intentions section when none exist', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: { moonPhases: [], retrogradePeriods: [], significantTransits: [], ingresses: [], eclipseCount: 0, signChangeCount: 0, text: 'Quiet sky' },
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 0,
      checkIns: [],
      goalsActive: 0,
      goalsCompletedInPeriod: 0,
      goalsCompletedApproximate: false,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(!prompt.includes('Intentions set during period:'))
  })
})

describe('Period Review: Goals', () => {
  it('labels completed count as "approximate" when using updated_at', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: { moonPhases: [], retrogradePeriods: [], significantTransits: [], ingresses: [], eclipseCount: 0, signChangeCount: 0, text: 'Quiet sky' },
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 0,
      checkIns: [],
      goalsActive: 3,
      goalsCompletedInPeriod: 2,
      goalsCompletedApproximate: true,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(prompt.includes('Active goals now: 3'))
    assert.ok(prompt.includes('Goals marked completed during period (approximate, based on last-updated date): 2'))
  })

  it('does not label as approximate when using completed_at', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: { moonPhases: [], retrogradePeriods: [], significantTransits: [], ingresses: [], eclipseCount: 0, signChangeCount: 0, text: 'Quiet sky' },
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 0,
      checkIns: [],
      goalsActive: 3,
      goalsCompletedInPeriod: 2,
      goalsCompletedApproximate: false,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(prompt.includes('Active goals now: 3'))
    assert.ok(prompt.includes('Goals marked completed during period: 2'))
    assert.ok(!prompt.includes('approximate'))
  })
})

describe('Period Review: No-entries prompt', () => {
  it('includes no-entries instruction when journal count is zero', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Test User',
      sky: { moonPhases: [], retrogradePeriods: [], significantTransits: [], ingresses: [], eclipseCount: 0, signChangeCount: 0, text: 'Quiet sky' },
      planTasksCompleted: [],
      planTasksOpen: [],
      planTasksCompletedCount: 0,
      planTasksOpenCount: 0,
      planTasksTotal: 0,
      dailyLogDays: 0,
      checkIns: [],
      goalsActive: 0,
      goalsCompletedInPeriod: 0,
      goalsCompletedApproximate: false,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: null,
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)
    assert.ok(prompt.includes('Journal excerpts: (none provided — do not mention this in your output)'))
  })
})
