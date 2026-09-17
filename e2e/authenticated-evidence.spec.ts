import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

// SAFE-02 / CONSENT-02 / ACCESS-04 authenticated-browser evidence.
//
// Setup:
//   1. supabase start (local Docker stack; needs [auth.third_party.clerk]
//      enabled in supabase/config.toml — already checked in)
//   2. set -a && . ./.env.staging.local && set +a && \
//        npx tsx scripts/seed-e2e-persona.mts
//   3. set -a && . ./.env.staging.local && set +a && \
//        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... CLERK_SECRET_KEY=... \
//        npm run dev   (Clerk keys from .env.local — same real dev instance)
//   4. npx playwright test
//
// Uses Clerk's real dev-instance test user (mara@example.com, Clerk
// publicMetadata.isDemo). Never run against production Supabase or the
// founder's real Clerk account.

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await clerk.signIn({ page, emailAddress: 'mara@example.com' })
})

test('SAFE-02: personalized week reading names itself truthfully and reads as persistent', async ({ page }) => {
  await page.goto('/preview')
  await expect(page.getByText('Personalized Birth-Chart Week Reading')).toBeVisible()
  await expect(page.getByText('Saved to your account to revisit')).toBeVisible()

  const bodyText = await page.locator('body').innerText()
  // Must not read as a time-gated trial — no countdown/expiry language.
  expect(bodyText).not.toMatch(/free trial/i)
  expect(bodyText).not.toMatch(/expires? in \d/i)
  expect(bodyText).not.toMatch(/\d+ days? (left|remaining)/i)
})

test('CONSENT-02: journal composer shows consent control and persists an entry', async ({ page, context }) => {
  await page.goto('/journal')

  const bodyBox = page.getByPlaceholder(/write|entry|today/i).first()
  await expect(bodyBox).toBeVisible({ timeout: 10_000 })
  const entryText = `E2E consent check entry ${Date.now()}`
  await bodyBox.fill(entryText)

  // Legacy consent toggle (KIAROS_JOURNAL_CONSENT_V2 defaults off in
  // production), the control this session's real users actually see.
  await expect(page.getByText('Add to Stelloquy memory')).toBeVisible()

  const saveButton = page.getByRole('button', { name: /save/i }).first()
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/journal') && r.request().method() === 'POST'),
    saveButton.click(),
  ])
  expect(response.status(), 'journal save POST succeeded').toBe(201)

  // /journal's default view is the composer, not a history list — the count
  // is what proves the save actually persisted and is visible to the user.
  // A fresh tab (not page.goto on the same page) avoids Next.js's client
  // router cache serving a stale RSC payload from before the save.
  const freshPage = await context.newPage()
  await freshPage.goto('/journal')
  await expect(freshPage.getByText(/\d+ entr(y|ies)/).first()).toContainText('1')
  await freshPage.close()
})

test('ACCESS-04: billing surface reflects an active entitlement, no contradictory upgrade prompt', async ({ page }) => {
  await page.goto('/settings')
  const manageBilling = page.getByRole('button', { name: /manage billing/i })
  await expect(manageBilling).toBeVisible({ timeout: 10_000 })

  await page.goto('/pricing')
  const bodyText = await page.locator('body').innerText()
  // Already on the top tier (planner_oracle, active annual) — the page
  // should not tell her to upgrade to what she already has.
  expect(bodyText.toLowerCase()).not.toContain('upgrade to unlock stelloquy')
})
