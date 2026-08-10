import { test, expect } from '@playwright/test';

test.describe('Headless E2E Smoke Test', () => {
  test('loads game, starts new game, and verifies zero uncaught JS runtime errors', async ({ page }) => {
    const pageErrors: Error[] = [];

    // Capture uncaught page errors (e.g. Uncaught SyntaxError, ReferenceError, TypeError)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // 1. Load root page
    await page.goto('/');

    // Verify Title Screen logo is visible
    const logoElement = page.locator('.title-screen__logo');
    await expect(logoElement).toBeVisible();

    // 2. Click Start Game on TitleScreen
    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible();
    await startGameBtn.click();

    // 3. Click Start Life on SetupScreen
    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // 4. Verify HUD Dashboard money badge loaded and visible
    const moneyBadge = page.locator('#stat-money');
    await expect(moneyBadge).toBeVisible({ timeout: 5000 });

    // 5. Open Status/Inventory modal
    const statusBtn = page.locator('#btn-inventory');
    await expect(statusBtn).toBeVisible();
    await statusBtn.click();

    // Verify status modal overlay opened
    const statusModal = page.locator('.building-modal-overlay');
    await expect(statusModal).toBeVisible();

    // Close modal by clicking close button
    const closeBtn = page.locator('.building-modal-content button').first();
    await closeBtn.click();
    await expect(statusModal).toBeHidden();

    // Fail test if any unhandled JS page errors occurred during navigation
    expect(pageErrors, `Uncaught page errors occurred: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });
});
