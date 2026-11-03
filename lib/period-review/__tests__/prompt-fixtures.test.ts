/**
 * Fixture prompt snapshots for period reviews
 * Run: npx tsx --test lib/period-review/__tests__/prompt-fixtures.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assemblePeriodReviewUserPrompt } from '@/lib/ai/period-review-system-prompt'
import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'
import { periodFor } from '@/lib/period-review/periods'
import type { PeriodSkySummary } from '@/lib/period-review/sky-for-period'

const mockSky: PeriodSkySummary = {
  moonPhases: [
    { date: '2026-10-08', phase: 'new', time: '12:00', sign: 'Libra', longitude: 195.0 },
    { date: '2026-10-23', phase: 'full', time: '18:00', sign: 'Taurus', longitude: 210.0 },
  ],
  retrogradePeriods: [],
  significantTransits: [],
  ingresses: [
    { planet: 'Sun', sign: 'Scorpio', date: '2026-10-23' },
    { planet: 'Mercury', sign: 'Scorpio', date: '2026-10-18' },
    { planet: 'Venus', sign: 'Sagittarius', date: '2026-10-25' },
    { planet: 'Mars', sign: 'Cancer', date: '2026-10-12' },
  ],
  eclipseCount: 0,
  signChangeCount: 6,
  text: 'Lunations (2): new 2026-10-08; full 2026-10-23',
}

describe('Fixture: October journaler', () => {
  it('assembles full user prompt with period-specific content', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Alex',
      sky: mockSky,
      planTasksCompleted: [
        { title: 'Finish quarterly review', date: '2026-10-05' },
        { title: 'Submit grant application', date: '2026-10-18' },
      ],
      planTasksOpen: [
        { title: 'Schedule team retreat', date: '2026-10-30' },
      ],
      planTasksCompletedCount: 2,
      planTasksOpenCount: 1,
      planTasksTotal: 3,
      dailyLogDays: 15,
      checkIns: [
        { date: '2026-10-01', mood: 'calm', energy: 6 },
        { date: '2026-10-05', mood: 'focused', energy: 8 },
        { date: '2026-10-12', mood: 'restless', energy: 7 },
        { date: '2026-10-18', mood: 'relieved', energy: 9 },
        { date: '2026-10-25', mood: 'content', energy: 7 },
      ],
      goalsActive: 4,
      goalsCompletedInPeriod: 1,
      goalsCompletedApproximate: false,
      intentions: [
        'Deepen creative practice through daily morning pages',
        'Reach out to three old friends for reconnection',
      ],
      journalEntryCount: 12,
      journalExcerpts: [
        { date: '2026-10-03', excerpt: 'Starting the month feeling grounded. The seasonal shift is palpable—autumn air, shorter days. I want to lean into reflection rather than production this month.' },
        { date: '2026-10-07', excerpt: 'Grant work is consuming. I keep second-guessing my framing. Is this the right approach? Talked it through with Jamie and feel a bit clearer.' },
        { date: '2026-10-14', excerpt: 'Had a breakthrough in the studio today. The new series is finally coming together. It feels vulnerable but true.' },
        { date: '2026-10-20', excerpt: 'Grant is submitted. Relief mixed with doubt. What will be, will be. Trying to trust the process.' },
        { date: '2026-10-28', excerpt: 'Reconnected with Sam over coffee. So good to talk about the old days and where we are now. Feels nourishing.' },
      ],
      quarterBlueprintTheme: 'Harvest and integration',
      monthBlueprintTheme: 'Inner work and creative depth',
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)

    // Verify structure
    assert.ok(prompt.includes('Write a period look back for October 2026'))
    assert.ok(prompt.includes('Member name: Alex'))

    // Verify ingresses
    assert.ok(prompt.includes('Ingresses (planet sign changes):'))
    assert.ok(prompt.includes('2026-10-23: Sun → Scorpio'))
    assert.ok(prompt.includes('2026-10-18: Mercury → Scorpio'))
    assert.ok(prompt.includes('2026-10-25: Venus → Sagittarius'))
    assert.ok(prompt.includes('2026-10-12: Mars → Cancer'))

    // Verify check-ins
    assert.ok(prompt.includes('Check-ins:'))
    assert.ok(prompt.includes('Daily check-in days: 15'))
    assert.ok(prompt.includes('2026-10-01, mood: calm, energy: 6'))
    assert.ok(prompt.includes('2026-10-18, mood: relieved, energy: 9'))

    // Verify intentions
    assert.ok(prompt.includes('Intentions set during period:'))
    assert.ok(prompt.includes('1. Deepen creative practice through daily morning pages'))
    assert.ok(prompt.includes('2. Reach out to three old friends for reconnection'))

    // Verify journal excerpts include dates
    assert.ok(prompt.includes('Journal excerpts (12 eligible entries):'))
    assert.ok(prompt.includes('2026-10-03: Starting the month feeling grounded'))
    assert.ok(prompt.includes('2026-10-20: Grant is submitted'))
    assert.ok(prompt.includes('2026-10-28: Reconnected with Sam'))

    // Verify goals
    assert.ok(prompt.includes('Active goals now: 4'))
    assert.ok(prompt.includes('Goals marked completed during period: 1'))
    assert.ok(!prompt.includes('approximate'))

    // Verify blueprint themes
    assert.ok(prompt.includes('Month theme: Inner work and creative depth'))
    assert.ok(prompt.includes('Quarter theme: Harvest and integration'))

    // Print redacted snapshot
    const redacted = prompt
      .replace(/Jamie/g, '[NAME]')
      .replace(/Sam/g, '[NAME]')
      .replace(/Starting the month.+?reflection rather than production this month\./s, '[JOURNAL EXCERPT 1]')
      .replace(/Grant work is consuming.+?feel a bit clearer\./s, '[JOURNAL EXCERPT 2]')
      .replace(/Had a breakthrough.+?vulnerable but true\./s, '[JOURNAL EXCERPT 3]')
      .replace(/Grant is submitted.+?trust the process\./s, '[JOURNAL EXCERPT 4]')
      .replace(/Reconnected with.+?Feels nourishing\./s, '[JOURNAL EXCERPT 5]')

    console.log('\n=== FIXTURE: October journaler (redacted) ===\n')
    console.log(redacted)
    console.log('\n=== END FIXTURE ===\n')
  })
})

describe('Fixture: October non-journaler', () => {
  it('assembles user prompt with no journal entries', () => {
    const sources: PeriodReviewSourceBundle = {
      period: periodFor('month', 2026, 10),
      displayName: 'Morgan',
      sky: mockSky,
      planTasksCompleted: [
        { title: 'Complete project proposal', date: '2026-10-10' },
      ],
      planTasksOpen: [
        { title: 'Review budget', date: '2026-10-28' },
        { title: 'Prep for November meeting', date: '2026-10-31' },
      ],
      planTasksCompletedCount: 1,
      planTasksOpenCount: 2,
      planTasksTotal: 3,
      dailyLogDays: 8,
      checkIns: [
        { date: '2026-10-02', mood: 'motivated', energy: 8 },
        { date: '2026-10-15', mood: null, energy: 6 },
        { date: '2026-10-29', mood: 'tired', energy: 5 },
      ],
      goalsActive: 2,
      goalsCompletedInPeriod: 0,
      goalsCompletedApproximate: false,
      intentions: [],
      journalEntryCount: 0,
      journalExcerpts: [],
      quarterBlueprintTheme: 'Harvest and integration',
      monthBlueprintTheme: null,
    }

    const prompt = assemblePeriodReviewUserPrompt(sources)

    // Verify structure
    assert.ok(prompt.includes('Write a period look back for October 2026'))
    assert.ok(prompt.includes('Member name: Morgan'))

    // Verify ingresses are present
    assert.ok(prompt.includes('Ingresses (planet sign changes):'))
    assert.ok(prompt.includes('2026-10-23: Sun → Scorpio'))

    // Verify check-ins
    assert.ok(prompt.includes('Check-ins:'))
    assert.ok(prompt.includes('Daily check-in days: 8'))
    assert.ok(prompt.includes('2026-10-02, mood: motivated, energy: 8'))
    assert.ok(prompt.includes('2026-10-15, energy: 6'))
    assert.ok(prompt.includes('2026-10-29, mood: tired, energy: 5'))

    // Verify no intentions section
    assert.ok(!prompt.includes('Intentions set during period:'))

    // Verify no-journal instruction
    assert.ok(prompt.includes('Journal excerpts: (none provided — do not mention this in your output)'))

    // Verify goals
    assert.ok(prompt.includes('Active goals now: 2'))
    assert.ok(prompt.includes('Goals marked completed during period: 0'))

    // Verify themes
    assert.ok(prompt.includes('Month theme: (none)'))
    assert.ok(prompt.includes('Quarter theme: Harvest and integration'))

    console.log('\n=== FIXTURE: October non-journaler ===\n')
    console.log(prompt)
    console.log('\n=== END FIXTURE ===\n')
  })
})

describe('Fixture: Stelloquy captures', () => {
  const base: PeriodReviewSourceBundle = {
    period: periodFor('month', 2026, 10),
    displayName: 'Morgan',
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

  it('labels whose words each saved capture is', () => {
    const prompt = assemblePeriodReviewUserPrompt({
      ...base,
      captureCount: 2,
      captureExcerpts: [
        { date: '2026-10-12', whose: 'member', excerpt: 'I keep circling back to the studio idea.' },
        { date: '2026-10-30', whose: 'stelloquy', excerpt: 'Rest can be the work this week.' },
      ],
    })
    assert.ok(prompt.includes('Saved from Stelloquy (2 saved during the period):'))
    assert.ok(prompt.includes("2026-10-12 (the member's own words): I keep circling back"))
    assert.ok(prompt.includes("2026-10-30 (Stelloquy's words, saved by the member): Rest can be"))
  })

  it('adds nothing when there are no saved captures', () => {
    const prompt = assemblePeriodReviewUserPrompt({ ...base, captureCount: 0, captureExcerpts: [] })
    assert.ok(!prompt.includes('Saved from Stelloquy'))
  })
})
