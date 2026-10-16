import { test, expect } from '@playwright/test';

test.describe('E2E Auto-Save and Game Resume', () => {
  test('persists game state, prompts on page reload, and seamlessly resumes gameplay', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // 1. Load initial page and clear any pre-existing localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Verify Title Screen is visible and no prompt is shown
    await expect(page.locator('.title-screen__logo')).toBeVisible();
    await expect(page.locator('[data-testid="resume-prompt-modal"]')).toBeHidden();

    // 2. Start a new game
    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible();
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // 3. Wait for game to enter playing phase
    const moneyBadge = page.locator('.stat-badge, .dynamic-money-badge').first();
    await expect(moneyBadge).toBeVisible({ timeout: 5000 });

    // Verify auto-save was written to localStorage
    await expect.poll(async () => {
      return await page.evaluate(() => Boolean(localStorage.getItem('fastlane_autosave')));
    }, { timeout: 5000 }).toBe(true);

    const savedJson = await page.evaluate(() => localStorage.getItem('fastlane_autosave'));
    expect(savedJson).not.toBeNull();
    const parsed = JSON.parse(savedJson!);
    expect(parsed.gameState).toBeDefined();
    expect(parsed.gameState.turn).toBe(1);

    // 4. Reload page (simulating mobile browser reset / leaving tab for long enough)
    await page.reload();

    // 5. Verify the resume prompt dialog appears asking to continue
    const resumeModal = page.locator('[data-testid="resume-prompt-modal"]');
    await expect(resumeModal).toBeVisible({ timeout: 5000 });
    await expect(resumeModal.locator('h2')).toContainText(/Continue Where You Left Off/i);

    // Verify saved information card is shown
    const saveCard = page.locator('[data-testid="resume-save-card"]');
    await expect(saveCard).toBeVisible();
    await expect(saveCard).toContainText(/Week 1/i);

    // 6. Click Continue Game
    const continueBtn = page.locator('[data-testid="btn-resume-continue"]');
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // 7. Verify we are right back in the game session
    await expect(resumeModal).toBeHidden();
    await expect(moneyBadge).toBeVisible({ timeout: 5000 });

    // 8. Test Settings Modal Export Save
    const settingsBtn = page.locator('#btn-settings');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const exportSaveBtn = page.locator('[data-testid="btn-export-save"]');
    await expect(exportSaveBtn).toBeVisible();

    // Close settings modal
    const closeSettingsBtn = page.locator('.building-modal__close').first();
    await closeSettingsBtn.click();

    // 9. Now test quitting game clears the auto-save
    await settingsBtn.click();
    const quitBtn = page.locator('[data-testid="btn-quit-game"]');
    await expect(quitBtn).toBeVisible();
    await quitBtn.click();

    const confirmQuitBtn = page.locator('[data-testid="btn-confirm-quit"]');
    await expect(confirmQuitBtn).toBeVisible();
    await confirmQuitBtn.click();

    // 10. Verify we returned to Title Screen and auto-save was cleared
    await expect(page.locator('.title-screen__logo')).toBeVisible();
    const autoSaveAfterQuit = await page.evaluate(() => localStorage.getItem('fastlane_autosave'));
    expect(autoSaveAfterQuit).toBeNull();

    // Reload page again — verify NO continue prompt appears
    await page.reload();
    await expect(page.locator('.title-screen__logo')).toBeVisible();
    await expect(page.locator('[data-testid="resume-prompt-modal"]')).toBeHidden();

    // Ensure zero uncaught runtime errors occurred throughout the entire flow
    expect(pageErrors).toHaveLength(0);
  });
});
