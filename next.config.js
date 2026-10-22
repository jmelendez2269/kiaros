const path = require('path')
const { featureFlagEnabled } = require('./lib/calendar/feature-flag-enabled.cjs')

const calendarDayOn = featureFlagEnabled(process.env.KIAROS_CALENDAR_DAY)
const iaJournalOn = featureFlagEnabled(process.env.NEXT_PUBLIC_IA_JOURNAL)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      // /oracle's legacy full-page chat is superseded by the Stelloquy
      // drawer, which StelloquyProvider mounts globally across every
      // (app) route — there's no separate destination page for it, so
      // old links land on /today where the drawer is already available.
      { source: '/oracle', destination: '/today', permanent: true },
      // Curriculum setup moved from onboarding flow to /curriculum/setup.
      { source: '/onboarding/curriculum', destination: '/curriculum/setup', permanent: true },
      ...(iaJournalOn
        ? [
            {
              source: '/insights/map',
              has: [{ type: 'query', key: 'tab', value: 'journal' }],
              destination: '/journal/entries',
              permanent: false,
            },
            {
              source: '/insights/map',
              has: [{ type: 'query', key: 'tab', value: 'map' }],
              destination: '/journal/patterns?view=map',
              permanent: false,
            },
            {
              source: '/insights/map',
              has: [{ type: 'query', key: 'tab', value: 'captures' }],
              destination: '/journal/patterns?view=captures',
              permanent: false,
            },
            { source: '/insights/map', destination: '/journal/patterns', permanent: false },
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
