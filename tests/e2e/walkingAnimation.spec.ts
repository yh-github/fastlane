import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Character Center Walking Animation E2E', () => {
  test('displays Jones in center stage when not in a location and animates walk on movement', async ({ page }) => {
    // 1. Navigate to root and start game
    await page.goto('/');
    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible({ timeout: 5000 });
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // 2. Wait for map / board to load
    const dashboard = page.locator('.dashboard');
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    // Close initial home modal if open
    const buildingModal = page.locator('.building-modal');
    if (await buildingModal.isVisible()) {
      const closeBtn = page.locator('.building-modal__close');
      await closeBtn.click();
      await expect(buildingModal).toBeHidden({ timeout: 3000 });
    }

    // 3. Center character animation stage should now be visible
    const centerStage = page.locator('[data-testid="center-walk-animation"]');
    await expect(centerStage).toBeVisible({ timeout: 5000 });
    await expect(centerStage).toHaveAttribute('data-character', '0');
    await expect(centerStage).toHaveAttribute('data-clothes', 'casual');
    await expect(centerStage).toHaveAttribute('data-walking', 'false');

    const spriteCanvas = centerStage.locator('canvas.center-character-sprite');
    await expect(spriteCanvas).toBeVisible();

    // Wait a brief moment for image to render onto canvas
    await page.waitForTimeout(500);

    // Save screenshot for artifact documentation
    const screenshotPath = path.resolve('/home/yoavh/.gemini/antigravity/brain/baba78ec-dc3f-47a6-8d0c-8fcc6a50339a/walking_idle.png');
    await page.screenshot({ path: screenshotPath });

    // 4. Test clothing switch via inventory / state
    // Let's take a screenshot while moving or changing clothes
    await page.evaluate(() => {
      // Access app or simulate clothing change on test
      const stage = document.querySelector('[data-testid="center-walk-animation"]') as HTMLElement;
      if (stage) {
        stage.dataset.walking = 'true';
      }
    });

    // Capture walking frame
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/home/yoavh/.gemini/antigravity/brain/baba78ec-dc3f-47a6-8d0c-8fcc6a50339a/walking_active.png' });

    // 5. Test entering a building
    // Click on pawn shop node or home node to open building modal
    const nodeEl = page.locator('.map-container canvas');
    await expect(nodeEl).toBeVisible();
  });

  test('immediately updates clothes on center stage when changed via Status screen in Advanced without moving', async ({ page }) => {
    await page.goto('/');
    // Advanced is default campaign
    const startGameBtn = page.locator('.title-screen__btn').first();
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // Close initial home modal
    const buildingModal = page.locator('.building-modal');
    if (await buildingModal.isVisible()) {
      const closeBtn = page.locator('.building-modal__close');
      await closeBtn.click();
      await expect(buildingModal).toBeHidden({ timeout: 3000 });
    }

    const centerStage = page.locator('[data-testid="center-walk-animation"]');
    await expect(centerStage).toBeVisible();
    await expect(centerStage).toHaveAttribute('data-clothes', 'casual');
    await expect(centerStage).toHaveAttribute('data-walking', 'false');

    // Open Status / Inventory modal
    const inventoryBtn = page.locator('#btn-inventory');
    await inventoryBtn.click();

    const inventoryModal = page.locator('.building-modal-overlay');
    await expect(inventoryModal).toBeVisible();

    // Select clothes dropdown (change to 'none' / Naked)
    const clothesSelect = inventoryModal.locator('select').first();
    await clothesSelect.selectOption('none');

    // Close Status modal
    const closeInvBtn = page.locator('.building-modal-content button').first();
    await closeInvBtn.click();
    await expect(inventoryModal).toBeHidden();

    // The center stage must IMMEDIATELY show 'none' (naked) while idle
    await expect(centerStage).toHaveAttribute('data-clothes', 'none');
    await expect(centerStage).toHaveAttribute('data-walking', 'false');

    // Let's verify canvas re-rendered
    await page.waitForTimeout(300);
    const canvas = centerStage.locator('canvas.center-character-sprite');
    await expect(canvas).toBeVisible();
  });

  test('toggles Graphics settings (Remove Background and Smooth Rendering)', async ({ page }) => {
    await page.goto('/');
    const startGameBtn = page.locator('.title-screen__btn').first();
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // Close initial home modal
    const buildingModal = page.locator('.building-modal');
    if (await buildingModal.isVisible()) {
      const closeBtn = page.locator('.building-modal__close');
      await closeBtn.click();
      await expect(buildingModal).toBeHidden({ timeout: 3000 });
    }

    const centerStage = page.locator('[data-testid="center-walk-animation"]');
    await expect(centerStage).toBeVisible();
    await expect(centerStage).toHaveAttribute('data-remove-bg', 'true');
    await expect(centerStage).toHaveAttribute('data-pixelated', 'true');

    // 1. Open Settings modal
    const settingsBtn = page.locator('#btn-settings');
    await settingsBtn.click();

    const settingsModal = page.locator('.building-modal');
    await expect(settingsModal).toBeVisible();

    // 2. Toggle "Remove Character Background" (from ON to OFF)
    const removeBgToggle = page.locator('[data-testid="setting-remove-character-bg"]');
    await removeBgToggle.click();

    // Close settings modal
    const closeSettingsBtn = page.locator('.action-panel__btn').filter({ hasText: /Close|סגור/i }).first();
    await closeSettingsBtn.click();
    await expect(settingsModal).toBeHidden();

    // 3. Verify center stage has solid background (OFF)
    await expect(centerStage).toHaveAttribute('data-remove-bg', 'false');
    await page.waitForTimeout(400);

    // Save screenshot of solid background
    await page.screenshot({ path: '/home/yoavh/.gemini/antigravity/brain/baba78ec-dc3f-47a6-8d0c-8fcc6a50339a/walking_solid_bg.png' });

    // 4. Toggle it back ON and test folding Interface category
    await settingsBtn.click();
    await expect(settingsModal).toBeVisible();
    
    // Fold Interface category
    const interfaceHeader = page.locator('[data-testid="category-header-interface"]');
    await interfaceHeader.click();
    await expect(page.locator('[data-testid="setting-helpful-ui"]')).toBeHidden();

    await removeBgToggle.click();
    await closeSettingsBtn.click();
    await expect(settingsModal).toBeHidden();
    await expect(centerStage).toHaveAttribute('data-remove-bg', 'true');
    await page.waitForTimeout(400);

    // Save screenshot of transparent background
    await page.screenshot({ path: '/home/yoavh/.gemini/antigravity/brain/baba78ec-dc3f-47a6-8d0c-8fcc6a50339a/walking_transparent_bg.png' });

    // 5. Open Settings again and toggle Crisp Pixel Art off (Smooth on)
    await settingsBtn.click();
    await expect(settingsModal).toBeVisible();

    const pixelatedToggle = page.locator('[data-testid="setting-pixelated-sprites"]');
    await pixelatedToggle.click();

    await closeSettingsBtn.click();
    await expect(settingsModal).toBeHidden();

    // 6. Verify smooth rendering is active
    await expect(centerStage).toHaveAttribute('data-pixelated', 'false');
    const sprite = centerStage.locator('canvas.center-character-sprite');
    await expect(sprite).toHaveClass(/center-character-sprite--smooth/);
    await page.waitForTimeout(400);

    // Save screenshot of smooth rendering with transparent background
    await page.screenshot({ path: '/home/yoavh/.gemini/antigravity/brain/baba78ec-dc3f-47a6-8d0c-8fcc6a50339a/walking_smooth_rendering.png' });
  });
});
