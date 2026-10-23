import { test, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { featureFlagEnabled } from '../lib/calendar/calendar-day-routes'

const iaOnboarding5On = featureFlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5)

test.describe('IA onboarding 5 (NEXT_PUBLIC_IA_ONBOARDING5)', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.signIn({ page, emailAddress: 'mara@example.com' })
  })

  test('legacy tradition URL redirects to goals when flag on', async ({ page }) => {
    test.skip(!iaOnboarding5On, 'Set NEXT_PUBLIC_IA_ONBOARDING5=true on the dev server for this test')
    await page.goto('/onboarding/tradition')
    await expect(page).toHaveURL(/\/onboarding\/goals$/)
  })

  test('legacy cycle URL redirects to year-focus when flag on', async ({ page }) => {
    test.skip(!iaOnboarding5On, 'Set NEXT_PUBLIC_IA_ONBOARDING5=true on the dev server for this test')
    await page.goto('/onboarding/cycle')
    await expect(page).toHaveURL(/\/onboarding\/year-focus$/)
  })

  test('legacy generating-week URL redirects to generating when flag on', async ({ page }) => {
    test.skip(!iaOnboarding5On, 'Set NEXT_PUBLIC_IA_ONBOARDING5=true on the dev server for this test')
    await page.goto('/onboarding/generating-week')
    await expect(page).toHaveURL(/\/onboarding\/generating$/)
  })

  test('theme step shows optional study focus card when flag on', async ({ page }) => {
    test.skip(!iaOnboarding5On, 'Set NEXT_PUBLIC_IA_ONBOARDING5=true on the dev server for this test')
    await page.goto('/onboarding/theme')
    await expect(page.getByText('Study focus (optional)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add study focus' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  })
})

test('legacy tradition URL stays on tradition when flag off', async ({ page }) => {
  test.skip(iaOnboarding5On, 'Requires NEXT_PUBLIC_IA_ONBOARDING5 unset or false on the dev server')
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await clerk.signIn({ page, emailAddress: 'mara@example.com' })
  await page.goto('/onboarding/tradition')
  await expect(page).toHaveURL(/\/onboarding\/tradition$/)
  await expect(page.getByText('Choose your interpretive tradition')).toBeVisible()
})
