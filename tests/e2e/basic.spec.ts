import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/MindOps/i)
})

test('login button is visible', async ({ page }) => {
  await page.goto('/')
  const loginButton = page.getByRole('button', { name: /LOGIN WITH GOOGLE/i })
  await expect(loginButton).toBeVisible()
})
