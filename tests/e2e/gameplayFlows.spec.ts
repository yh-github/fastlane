import { test, expect } from '@playwright/test';

test.describe('Headless E2E Multi-Turn Gameplay Flows', () => {
  test('executes multi-turn game setup, exhausts turn 1 hours, exits location to advance to turn 2 and resets clock', async ({ page }) => {
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

    // 4. Verify HUD Dashboard badges loaded and Turn 1 indicator
    const moneyBadge = page.locator('#stat-money');
    await expect(moneyBadge).toBeVisible({ timeout: 5000 });

    const dashboard = page.locator('.dashboard');
    await expect(dashboard).toBeVisible();
    await expect(dashboard).toContainText(/Week 1|שבוע 1/i);
    await expect(dashboard).toContainText(/60(\.0)?\s*\/\s*60/);

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

    // 7. Verify Home Building Modal is open on turn start
    const buildingModal = page.locator('.building-modal');
    await expect(buildingModal).toBeVisible({ timeout: 5000 });

    // 8. Spend all 60 hours in Turn 1 (Relax takes 6 hrs each, click 10 times)
    const relaxBtn = page.locator('[data-action-target="relax"]');
    await expect(relaxBtn).toBeVisible();

    for (let i = 0; i < 10; i++) {
      await relaxBtn.click();
      const confirmRelaxBtn = page.getByRole('button', { name: /Relax Anyway|הירגע בכל זאת/i });
      if (await confirmRelaxBtn.isVisible()) {
        await confirmRelaxBtn.click();
      }
    }

    // Verify hours dropped to 0.0
    await expect(dashboard).toContainText(/0\.0\s*\/\s*60/);

    // 9. Exit the location (close building modal) with 0.0 hours left -> ends turn & runs home
    const closeBuildingBtn = page.locator('.building-modal__close');
    await closeBuildingBtn.click();

    // Dismiss any turn event modals (e.g. starvation / turn start events)
    const eventNextBtn = page.locator('button').filter({ hasText: /Next|Continue|OK|הבא|המשך/i }).first();
    try {
      await eventNextBtn.waitFor({ state: 'visible', timeout: 2000 });
      while (await eventNextBtn.isVisible()) {
        await eventNextBtn.click();
        await page.waitForTimeout(100);
      }
    } catch {
      // No event modal displayed, continue
    }

    // 10. Verify Weekend Screen appears for Turn 2
    const weekendScreen = page.locator('.weekend-screen');
    await expect(weekendScreen).toBeVisible({ timeout: 5000 });
    await expect(weekendScreen).toContainText(/Weekend|סוף שבוע/i);

    // 11. Click Start Week 2 on Weekend Screen
    const startWeek2Btn = page.locator('.weekend-screen button').filter({ hasText: /Start Week|התחל שבוע/i }).first();
    await expect(startWeek2Btn).toBeVisible();
    await startWeek2Btn.click();

    // 12. Verify Week 2 begins: Dashboard displays Week 2 and hours reset
    await expect(weekendScreen).toBeHidden();
    await expect(dashboard).toContainText(/Week 2|שבוע 2/i);
    await expect(dashboard).toContainText(/(40|50|60)(\.0)?\s*\/\s*60/);

    // 13. In Week 2, open Home modal if not open and spend hours
    const homeNode = page.locator('[data-action-target="relax"]');
    if (!await homeNode.isVisible()) {
      // Open home building modal
      const firstNode = page.locator('.building-modal');
      if (!await firstNode.isVisible()) {
        const homeBtn = page.locator('#btn-home');
        if (await homeBtn.isVisible()) await homeBtn.click();
      }
    }

    const week2RelaxBtn = page.locator('[data-action-target="relax"]');
    if (await week2RelaxBtn.isVisible()) {
      for (let i = 0; i < 10; i++) {
        await week2RelaxBtn.click();
        const confirmRelaxBtn = page.getByRole('button', { name: /Relax Anyway|הירגע בכל זאת/i });
        if (await confirmRelaxBtn.isVisible()) {
          await confirmRelaxBtn.click();
        }
      }
      await expect(dashboard).toContainText(/0\.0\s*\/\s*60/);

      // Exit location at 0.0 hours -> advances to Week 3 Weekend
      if (await closeBuildingBtn.isVisible()) {
        await closeBuildingBtn.click();
      }

      try {
        await eventNextBtn.waitFor({ state: 'visible', timeout: 2000 });
        while (await eventNextBtn.isVisible()) {
          await eventNextBtn.click();
          await page.waitForTimeout(100);
        }
      } catch {
        // No event modal
      }

      await expect(weekendScreen).toBeVisible({ timeout: 5000 });
      const startWeek3Btn = page.locator('.weekend-screen button').filter({ hasText: /Start Week|התחל שבוע/i }).first();
      await expect(startWeek3Btn).toBeVisible();
      await startWeek3Btn.click();

      // 14. Verify Week 3 begins
      await expect(dashboard).toContainText(/Week 3|שבוע 3/i);
      await expect(dashboard).toContainText(/(40|50|60)(\.0)?\s*\/\s*60/);
    }

    // Verify zero uncaught runtime exceptions occurred throughout gameplay
    expect(pageErrors, `Uncaught page errors: ${pageErrors.map((e) => e.message).join('; ')}`).toHaveLength(0);
  });
});
