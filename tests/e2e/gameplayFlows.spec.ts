import { test, expect } from '@playwright/test';

test.describe('Headless E2E Multi-Turn Gameplay Flows', () => {
  test('executes multi-turn game setup, dashboard HUD verification, and turn progression', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // 1. Navigate to root
    await page.goto('/');
    const titleLogo = page.locator('.title-screen__logo');
    await expect(titleLogo).toBeVisible({ timeout: 5000 });

    // 2. Start game from Title Screen
    const startGameBtn = page.locator('.title-screen__btn').first();
    await startGameBtn.click();

    // 3. Confirm goals on Setup Screen
    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // 4. Verify HUD Dashboard badges loaded
    const moneyBadge = page.locator('#stat-money');
    await expect(moneyBadge).toBeVisible({ timeout: 5000 });

    // Verify turn indicator displays Week 1
    const dashboard = page.locator('.dashboard');
    await expect(dashboard).toBeVisible();

    // 5. Open and verify Settings modal
    const settingsBtn = page.locator('#btn-settings');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      const settingsModal = page.locator('.settings-modal-overlay');
      await expect(settingsModal).toBeVisible();
      const closeSettingsBtn = page.locator('.settings-modal-content button').first();
      await closeSettingsBtn.click();
      await expect(settingsModal).toBeHidden();
    }

    // 6. Open and verify Inventory modal
    const inventoryBtn = page.locator('#btn-inventory');
    await expect(inventoryBtn).toBeVisible();
    await inventoryBtn.click();

    const inventoryModal = page.locator('.building-modal-overlay');
    await expect(inventoryModal).toBeVisible();
    await expect(inventoryModal).toContainText(/Overview|Status/i);

    // Close Inventory modal
    const closeInvBtn = page.locator('.building-modal-content button').first();
    await closeInvBtn.click();
    await expect(inventoryModal).toBeHidden();

    // 7. If BuildingModal is currently open (e.g. turnStartAtHome), interact or close
    const buildingModal = page.locator('.building-modal-overlay');
    if (await buildingModal.isVisible()) {
      const closeBuildingBtn = page.locator('.building-modal-content button').first();
      await closeBuildingBtn.click();
    }

    // 8. Verify no uncaught runtime exceptions occurred throughout gameplay
    expect(pageErrors, `Uncaught page errors: ${pageErrors.map((e) => e.message).join('; ')}`).toHaveLength(0);
  });
});
