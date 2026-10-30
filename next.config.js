const path = require('path')
const { featureFlagEnabled } = require('./lib/calendar/feature-flag-enabled.cjs')

const calendarDayOn = featureFlagEnabled(process.env.KIAROS_CALENDAR_DAY)
const iaJournalOn = featureFlagEnabled(process.env.NEXT_PUBLIC_IA_JOURNAL)
const iaOverlaysOn = featureFlagEnabled(process.env.NEXT_PUBLIC_IA_OVERLAYS)

const periodReviewPreviewBranch =
  process.env.VERCEL_GIT_COMMIT_REF === 'cursor/period-review-01-3c9a' &&
  process.env.VERCEL_ENV === 'preview'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_KIAROS_PERIOD_REVIEW: periodReviewPreviewBranch
      ? 'true'
      : process.env.NEXT_PUBLIC_KIAROS_PERIOD_REVIEW ?? '',
    KIAROS_PERIOD_REVIEW: periodReviewPreviewBranch
      ? 'true'
      : process.env.KIAROS_PERIOD_REVIEW ?? '',
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      include: path.join(__dirname, 'content', 'guides'),
      type: 'asset/source',
    })
    return config
  },
  outputFileTracingIncludes: {
    '/api/admin/artifacts/[orderId]/export': [
      './docs/assets/etsy/natal-report-tour/*.jpg',
      './node_modules/@sparticuz/chromium/bin/**/*',
    ],
  },
  async redirects() {
    return [
      // Kairos redesign — Today supersedes the dashboard. Permanent so the
      // browser remembers; tracker route folds into the Journal screen.
      { source: '/dashboard', destination: '/today', permanent: true },
      ...(!calendarDayOn
        ? [
            {
              source: '/calendar',
              destination: '/year',
              permanent: true,
            },
          ]
        : []),
      ...(!iaOverlaysOn
        ? [
            // /oracle's legacy full-page chat is superseded by the Stelloquy
            // drawer when IA overlays are off — old links land on /today.
            { source: '/oracle', destination: '/today', permanent: true },
          ]
        : []),
      // Curriculum setup moved from onboarding flow to /curriculum/setup.
      { source: '/onboarding/curriculum', destination: '/curriculum/setup', permanent: true },
      ...(iaJournalOn
        ? [
            // /insights/map (+ ?tab=) → journal IA routes without forwarding `tab` (middleware).
            { source: '/reflections', destination: '/journal/look-back', permanent: false },
            {
              source: '/year',
              has: [{ type: 'query', key: 'view', value: 'review' }],
              destination: '/journal/look-back?view=quarter',
              permanent: false,
            },
            { source: '/year/unwrapped', destination: '/journal/look-back?view=year', permanent: false },
          ]
        : []),
    ]
  },
}

module.exports = nextConfig
