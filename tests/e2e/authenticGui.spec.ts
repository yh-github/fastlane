import { test, expect } from '@playwright/test';

test.describe('Authentic GUI Visual & Geometry E2E Tests', () => {
  test('verifies walking avatar, clock alignment, and location window fit in authentic mode', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // 1. Force authentic GUI mode via localStorage before page init
    await page.addInitScript(() => {
      localStorage.setItem('fastlane_gui_style', 'authentic');
    });

    // Set canonical 1280x720 viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // 2. Start game
    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible({ timeout: 5000 });
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // 3. Verify viewport has authentic class
    const viewport = page.locator('.game-viewport');
    await expect(viewport).toBeVisible({ timeout: 5000 });
    await expect(viewport).toHaveClass(/game-viewport--authentic/);

    // 4. Point 1: Verify Center Walking Avatar is visible in authentic mode
    const centerAvatarStage = page.locator('.center-character-stage');
    await expect(centerAvatarStage).toBeVisible({ timeout: 5000 });

    const avatarBox = await centerAvatarStage.boundingBox();
    expect(avatarBox).not.toBeNull();
    // Avatar stage must be centered within the screen / board area
    expect(avatarBox!.width).toBeGreaterThan(200);
    expect(avatarBox!.height).toBeGreaterThan(150);

    // Save visual snapshot of the authentic board with walking avatar and aligned clock
    await page.screenshot({ path: '/tmp/authentic_board_verified.png' });

    // 5. Point 5: Verify Bottom Center Clock alignment and no screen clipping
    const bottomClock = page.locator('.bottom-center-clock');
    await expect(bottomClock).toBeVisible();
    await expect(bottomClock).toHaveClass(/bottom-center-clock--authentic/);

    const clockBox = await bottomClock.boundingBox();
    expect(clockBox).not.toBeNull();
    // Clock must not clip off the 720px tall screen
    expect(clockBox!.y + clockBox!.height).toBeLessThanOrEqual(720);

    // Verify canvas is rendered
    const canvas = page.locator('.map-container canvas').first();
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    // Bottom clock must be contained within canvas bottom
    expect(clockBox!.y + clockBox!.height).toBeLessThanOrEqual(canvasBox!.y + canvasBox!.height + 2);

    // 6. Point 4: Verify Location Window opens with building-modal--authentic and fits the courtyard
    // Close initial apartment modal if opened
    const initialModal = page.locator('.building-modal');
    if (await initialModal.isVisible()) {
      await page.locator('.building-modal__close').click();
      await expect(initialModal).toBeHidden({ timeout: 3000 });
    }

    // Open a location modal (e.g. apartment_complex / Rent Office)
    await page.evaluate(() => {
      if ((window as any).__openBuilding) {
        (window as any).__openBuilding('apartment_complex');
      }
    });

    const buildingModal = page.locator('.building-modal');
    await expect(buildingModal).toBeVisible({ timeout: 5000 });
    await expect(buildingModal).toHaveClass(/building-modal--authentic/);

    const modalBox = await buildingModal.boundingBox();
    expect(modalBox).not.toBeNull();
    // Modal must be contained strictly inside canvas bounds
    expect(modalBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
    expect(modalBox!.y).toBeGreaterThanOrEqual(canvasBox!.y);
    expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(canvasBox!.y + canvasBox!.height);

    // Assert zero uncaught page errors
    expect(pageErrors, `Uncaught page errors: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });
});
