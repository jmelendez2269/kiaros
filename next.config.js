/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Kairos redesign — Today supersedes the dashboard. Permanent so the
      // browser remembers; tracker route folds into the Journal screen.
      { source: '/dashboard', destination: '/today', permanent: true },
      // /oracle still resolves to the legacy chat page in Phase 1.B — the
      // drawer mounted globally is the recommended entry point. Once Phase
      // 4 ships the new Journal screen we can also redirect /tracker.
    ]
  },
}

module.exports = nextConfig
