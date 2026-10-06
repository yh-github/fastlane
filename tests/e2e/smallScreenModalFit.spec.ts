import { test, expect } from '@playwright/test';

test.describe('Small Screen Modal Fit & Interactions E2E', () => {
  test('verifies University and Bank modals fit on small screen viewports (800x600 and 1024x640)', async ({ page }) => {
    // 1. Set viewport to small screen 800x600
    await page.setViewportSize({ width: 800, height: 600 });

    // 2. Load root page and start new game
    await page.goto('/');
    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible({ timeout: 5000 });
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // 3. Verify HUD loads and close initial apartment modal
    const dashboard = page.locator('.dashboard, .side-hud');
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    const buildingModal = page.locator('.building-modal');
    if (await buildingModal.isVisible()) {
      await page.locator('.building-modal__close').click();
      await expect(buildingModal).toBeHidden({ timeout: 3000 });
    }

    // 4. Open University via __openBuilding
    await page.evaluate(() => {
      (window as any).__openBuilding('university');
    });

    await expect(buildingModal).toBeVisible({ timeout: 5000 });
    await expect(buildingModal).toContainText(/Hi-Tech U|University/i);

    // Verify folder tab ears above University modal
    const uniTabEars = page.locator('[data-testid="university-tab-ears"]');
    await expect(uniTabEars).toBeVisible();

    const availableEar = page.locator('[data-testid="tab-ear-available"]');
    const treeEar = page.locator('[data-testid="tab-ear-tree"]');
    await expect(availableEar).toBeVisible();
    await expect(treeEar).toBeVisible();
    await expect(availableEar).toHaveClass(/building-modal__tab-ear--active/);

    // Verify unenrolled class card does not display "Available" or "Tuition: $"
    const unenrolledCard = page.locator('[data-testid^="unenrolled-class-"]').first();
    await expect(unenrolledCard).toBeVisible();
    await expect(unenrolledCard).not.toContainText(/Available/i);
    await expect(unenrolledCard).not.toContainText(/Tuition:\s*\$/i);

    // Click unenrolled class card -> triggers clerk speech bubble
    await unenrolledCard.click();
    const clerkBubble = page.locator('.speech-bubble');
    await expect(clerkBubble).toBeVisible({ timeout: 3000 });
    await expect(clerkBubble).toContainText(/not enrolled in this class/i);

    // Switch to Class Tree tab ear
    await treeEar.click();
    await expect(treeEar).toHaveClass(/building-modal__tab-ear--active/);
    await expect(availableEar).not.toHaveClass(/building-modal__tab-ear--active/);

    // Check modal boundary fits within 800x600 viewport
    const uniBox = await buildingModal.boundingBox();
    expect(uniBox).not.toBeNull();
    if (uniBox) {
      expect(uniBox.y).toBeGreaterThanOrEqual(0);
      expect(uniBox.y + uniBox.height).toBeLessThanOrEqual(605); // modal fits in small viewport
    }

    // Close University modal
    await page.locator('.building-modal__close').click();
    await expect(buildingModal).toBeHidden({ timeout: 3000 });

    // 5. Open Bank via __openBuilding
    await page.evaluate(() => {
      (window as any).__openBuilding('bank');
    });

    await expect(buildingModal).toBeVisible({ timeout: 5000 });
    await expect(buildingModal).toContainText(/Bank/i);

    // Verify folder tab ears above Bank modal
    const bankTabEars = page.locator('[data-testid="bank-tab-ears"]');
    await expect(bankTabEars).toBeVisible();

    const bankingEar = page.locator('[data-testid="tab-ear-banking"]');
    const stocksEar = page.locator('[data-testid="tab-ear-stocks"]');
    const loansEar = page.locator('[data-testid="tab-ear-loans"]');

    await expect(bankingEar).toBeVisible();
    await expect(stocksEar).toBeVisible();
    await expect(loansEar).toBeVisible();
    await expect(bankingEar).toHaveClass(/building-modal__tab-ear--active/);

    // Switch to Stocks tab ear
    await stocksEar.click();
    await expect(stocksEar).toHaveClass(/building-modal__tab-ear--active/);

    // Switch to Loans tab ear
    await loansEar.click();
    await expect(loansEar).toHaveClass(/building-modal__tab-ear--active/);

    // Check bank boundary fits within 800x600 viewport
    const bankBox = await buildingModal.boundingBox();
    expect(bankBox).not.toBeNull();
    if (bankBox) {
      expect(bankBox.y).toBeGreaterThanOrEqual(0);
      expect(bankBox.y + bankBox.height).toBeLessThanOrEqual(605);
    }

    // 6. Test Work Console toggle and slim WORK dock button
    // When Work Console is closed, bottom WORK dock button is visible and slim
    const workDockBtn = page.locator('[data-testid="btn-work-dock"]');
    if (await workDockBtn.isVisible()) {
      await expect(workDockBtn).toHaveText(/💼 WORK/);
      // Click WORK dock to open console
      await workDockBtn.click();

      // Console wing opens
      const workWing = page.locator('.work-card-wing');
      await expect(workWing).toBeVisible({ timeout: 3000 });

      // Bottom WORK dock button should now be completely hidden
      await expect(workDockBtn).toBeHidden();

      // Close Work Console via wing close button
      const closeWingBtn = page.locator('[data-testid="btn-close-work-console"]');
      await closeWingBtn.click();
      await expect(workWing).toBeHidden();

      // Bottom WORK dock button re-appears
      await expect(workDockBtn).toBeVisible();
      await expect(workDockBtn).toHaveText(/💼 WORK/);
    }

    // Close Bank modal
    await page.locator('.building-modal__close').click();
    await expect(buildingModal).toBeHidden({ timeout: 3000 });

    // 7. Test in 1024x640 viewport
    await page.setViewportSize({ width: 1024, height: 640 });

    // Reopen University
    await page.evaluate(() => {
      (window as any).__openBuilding('university');
    });
    await expect(buildingModal).toBeVisible();
    const uniBox1024 = await buildingModal.boundingBox();
    expect(uniBox1024).not.toBeNull();
    if (uniBox1024) {
      expect(uniBox1024.y + uniBox1024.height).toBeLessThanOrEqual(645);
    }

    // Reopen Bank
    await page.locator('.building-modal__close').click();
    await page.evaluate(() => {
      (window as any).__openBuilding('bank');
    });
    await expect(buildingModal).toBeVisible();
    const bankBox1024 = await buildingModal.boundingBox();
    expect(bankBox1024).not.toBeNull();
    if (bankBox1024) {
      expect(bankBox1024.y + bankBox1024.height).toBeLessThanOrEqual(645);
    }
  });
});
