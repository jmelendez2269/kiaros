import type { PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'

/**
 * "A question to carry" must name one concrete thing from the period (a dated
 * sky overlap, a journal theme, an intention, or a done or open task) and stay
 * an open question. Pattern, not prophecy: no prediction or causal wording.
 */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
]

const SKY_WORDS = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'node', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces', 'retrograde', 'trine', 'square', 'opposition',
  'conjunction', 'sextile', 'eclipse', 'ingress',
]

const STOP = new Set([
  'about', 'after', 'again', 'also', 'any', 'anything', 'back', 'been', 'before', 'being', 'carry',
  'could', 'does', 'from', 'have', 'into', 'just', 'like', 'make', 'more', 'most', 'month', 'next',
  'over', 'period', 'quarter', 'really', 'same', 'some', 'something', 'still', 'than', 'that', 'their',
  'them', 'then', 'there', 'these', 'they', 'thing', 'things', 'this', 'those', 'through', 'time',
  'want', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'yours',
  'feel', 'felt', 'keep', 'open', 'done', 'week', 'weeks', 'days', 'today',
  ...MONTHS,
])

const PREDICTIVE = [
  /\bwill\b/i, /\bgoing to\b/i, /\bdestined\b/i, /\bmeant to\b/i, /\bmeant\b/i, /\bthe universe\b/i,
  /\bbecause of\b/i, /\bbecause\b/i, /\bcaused?\b/i, /\bbrings?\b/i, /\bbrought\b/i, /\bdue to\b/i,
  /\bled to\b/i, /\btrigger(?:ed)?\b/i, /\bexpect\b/i, /\bsign\b/i,
  /\bforces?\b/i, /\bmakes? you\b/i, /\bneed to\b/i, /\bmust\b/i, /\bshould\b/i,
]

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []).map((w) => w.replace(/'s$/, ''))
}

function stem(w: string): string {
  return w.replace(/(ing|ed|es|s)$/, '')
}

/** Content words a question may reuse to point at something from the period. */
export function periodAnchorTerms(sources: PeriodReviewSourceBundle): Set<string> {
  const texts: string[] = [
    ...sources.intentions,
    ...sources.journalExcerpts.map((e) => e.excerpt),
    ...sources.planTasksCompleted.map((t) => t.title),
    ...sources.planTasksOpen.map((t) => t.title),
    sources.monthBlueprintTheme ?? '',
    sources.quarterBlueprintTheme ?? '',
  ]
  const out = new Set<string>()
  for (const t of texts) {
    for (const w of words(t)) {
      if (w.length >= 4 && !STOP.has(w)) out.add(stem(w))
    }
  }
  return out
}

function skyTermsForPeriod(sources: PeriodReviewSourceBundle): Set<string> {
  const out = new Set<string>()
  const text = [sources.sky.text, ...sources.sky.ingresses.map((i) => `${i.planet} ${i.sign}`)].join(' ')
  for (const w of words(text)) if (SKY_WORDS.includes(w)) out.add(w)
  return out
}

function namesADate(q: string): boolean {
  const lower = q.toLowerCase()
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(lower)) return true
  if (/\b\d{1,2}(st|nd|rd|th)\b/.test(lower)) return true
  return MONTHS.some((m) => new RegExp(`\\b${m}\\.? \\d{1,2}\\b`).test(lower))
}

export type QuestionAnchorCheck =
  | { ok: true; anchor: 'sky' | 'period-term' }
  | { ok: false; reason: 'not-a-question' | 'predictive' | 'no-anchor' }

export function checkQuestionToCarry(question: string, sources: PeriodReviewSourceBundle): QuestionAnchorCheck {
  const q = question.trim()
  if (!q.endsWith('?')) return { ok: false, reason: 'not-a-question' }
  if (PREDICTIVE.some((re) => re.test(q))) return { ok: false, reason: 'predictive' }

  const qWords = words(q)
  const sky = skyTermsForPeriod(sources)
  if (namesADate(q) && qWords.some((w) => sky.has(w))) return { ok: true, anchor: 'sky' }

  const terms = periodAnchorTerms(sources)
  if (qWords.some((w) => w.length >= 4 && !STOP.has(w) && terms.has(stem(w)))) {
    return { ok: true, anchor: 'period-term' }
  }
  // A named planet or sign that was in this period's sky also counts, even without a date.
  if (qWords.some((w) => sky.has(w) && !['square', 'trine', 'sextile', 'opposition', 'conjunction'].includes(w))) {
    return { ok: true, anchor: 'sky' }
  }
  return { ok: false, reason: 'no-anchor' }
}
