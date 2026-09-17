import { defineConfig } from '@playwright/test'

// E2E config for the SAFE-02 / CONSENT-02 / ACCESS-04 authenticated-browser
// evidence gate. Points at a locally-run dev server backed by local Docker
// Supabase (never production) — see .env.staging.local and
// docs/planning/access-memory-commerce-roadmap.md.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3699',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list']],
})
