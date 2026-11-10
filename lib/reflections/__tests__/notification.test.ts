/**
 * The "new reflection" notice: what is announced, what it says, where it
 * leads and where it stays out of the way.
 * Run: npx tsx --test lib/reflections/__tests__/notification.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { noticeHiddenOn, pickReflectionNotice, reflectionNoticeHref, reflectionNoticeText, type UnseenReflection } from '../notification'

const today = '2026-11-10'
const report = (kind: UnseenReflection['kind'], start: string, end: string, status = 'ready', hasSky = true): UnseenReflection => ({ kind, start, end, status, hasSky })
const week = report('week', '2026-11-02', '2026-11-09')
const october = report('month', '2026-10-01', '2026-11-01')

describe('pickReflectionNotice', () => {
  it('announces the period that closed most recently, and counts the rest', () => {
    assert.deepEqual(pickReflectionNotice([october, week], today), { kind: 'week', start: '2026-11-02', more: 1 })
  })
  it('puts the longer period first when two close on the same day', () => {
    const q3 = report('quarter', '2026-07-01', '2026-10-01'), september = report('month', '2026-09-01', '2026-10-01')
    assert.equal(pickReflectionNotice([september, q3], today)?.kind, 'quarter')
  })
  it('stays quiet about old periods prepared while catching up', () => {
    assert.equal(pickReflectionNotice([report('week', '2026-05-18', '2026-05-25'), report('month', '2026-06-01', '2026-07-01')], today), null)
    assert.deepEqual(pickReflectionNotice([report('week', '2026-05-18', '2026-05-25'), week], today), { kind: 'week', start: '2026-11-02', more: 0 })
  })
  it('does not announce a week read only from the sky, but does announce a month', () => {
    assert.equal(pickReflectionNotice([report('week', '2026-11-02', '2026-11-09', 'empty')], today), null)
    assert.equal(pickReflectionNotice([report('month', '2026-10-01', '2026-11-01', 'empty')], today)?.kind, 'month')
  })
  it('never announces a blank report, or one not finished', () => {
    assert.equal(pickReflectionNotice([report('month', '2026-10-01', '2026-11-01', 'empty', false)], today), null)
    assert.equal(pickReflectionNotice([report('month', '2026-10-01', '2026-11-01', 'generating')], today), null)
    assert.equal(pickReflectionNotice([], today), null)
  })
})

describe('what the notice says', () => {
  it('names the period', () => {
    assert.equal(reflectionNoticeText({ kind: 'week', start: '2026-11-02', more: 0 }), 'Your reflection on the week of Nov 2 is ready.')
    assert.equal(reflectionNoticeText({ kind: 'month', start: '2026-10-01', more: 0 }), 'Your reflection on October is ready.')
    assert.equal(reflectionNoticeText({ kind: 'quarter', start: '2026-07-01', more: 0 }), 'Your reflection on Q3 is ready.')
    assert.equal(reflectionNoticeText({ kind: 'year', start: '2026-01-01', more: 0 }), 'Your 2026 Unwrapped is ready.')
  })
  it('mentions others that are waiting', () => {
    assert.equal(reflectionNoticeText({ kind: 'week', start: '2026-11-02', more: 1 }), 'Your reflection on the week of Nov 2 is ready. One more is waiting too.')
    assert.equal(reflectionNoticeText({ kind: 'week', start: '2026-11-02', more: 3 }), 'Your reflection on the week of Nov 2 is ready. 3 more are waiting too.')
  })
})

describe('where it leads and where it steps aside', () => {
  const notice = { kind: 'week' as const, start: '2026-11-02' }
  it('links straight to that reflection', () => {
    assert.equal(reflectionNoticeHref(notice), '/reflections?kind=week&start=2026-11-02')
    assert.equal(reflectionNoticeHref({ kind: 'year', start: '2025-01-01' }), '/reflections?kind=year&start=2025-01-01')
  })
  it('is hidden where reflections are already on screen', () => {
    for (const path of ['/reflections', '/journal/look-back', '/year/unwrapped']) assert.equal(noticeHiddenOn(path, notice, null), true, path)
    assert.equal(noticeHiddenOn('/journal', notice, null), false)
  })
  it('is hidden on Today only while the Last week card points at the same week', () => {
    assert.equal(noticeHiddenOn('/today', notice, '2026-11-02'), true)
    assert.equal(noticeHiddenOn('/today', notice, null), false)
    assert.equal(noticeHiddenOn('/today', { kind: 'month', start: '2026-10-01' }, '2026-11-02'), false)
  })
})
