const path = require('path')
const { featureFlagEnabled } = require('./lib/calendar/feature-flag-enabled.cjs')

const calendarDayOn = featureFlagEnabled(process.env.KIAROS_CALENDAR_DAY)

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
    ]
  },
}

module.exports = nextConfig
