/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Kairos redesign — Today supersedes the dashboard. Permanent so the
      // browser remembers; tracker route folds into the Journal screen.
      { source: '/dashboard', destination: '/today', permanent: true },
      // /calendar consolidates into /year — CosmicCalendar moves to the new
      // IA, leather palette preserved. Old /calendar links still resolve.
      { source: '/calendar', destination: '/year', permanent: true },
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
