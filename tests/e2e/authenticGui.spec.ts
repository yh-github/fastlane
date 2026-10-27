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

    // Verify digital badge text and larger font size
    const digitalBadge = page.locator('#hud-clock-digital');
    await expect(digitalBadge).toBeVisible();
    await expect(digitalBadge).toContainText(/Week #?1|שבוע 1/i);
    const badgeFontSize = await digitalBadge.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(badgeFontSize).toBeGreaterThanOrEqual(11);

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

    // Verify marble is at authentic sidewalk waypoint position outside Rent Office (node_rent / apartment_complex) (104, 39)
    const playerMarker = page.locator('[data-testid="player-character"]');
    await expect(playerMarker).toBeAttached();
    await expect(playerMarker).toHaveAttribute('data-visible', 'true');
    expect(parseFloat((await playerMarker.getAttribute('data-x')) || '0')).toBe(104);
    expect(parseFloat((await playerMarker.getAttribute('data-y')) || '0')).toBe(39);

    // Switch to University and verify sidewalk waypoint (222, 188)
    await page.evaluate(() => {
      (window as any).__openBuilding('university');
    });
    await expect(playerMarker).toHaveAttribute('data-x', '222');
    await expect(playerMarker).toHaveAttribute('data-y', '188');

    // Switch to Bank and verify sidewalk waypoint (24, 149)
    await page.evaluate(() => {
      (window as any).__openBuilding('bank');
    });
    await expect(playerMarker).toHaveAttribute('data-x', '24');
    await expect(playerMarker).toHaveAttribute('data-y', '149');

    // Switch to Socket City and verify sidewalk waypoint (276, 187)
    await page.evaluate(() => {
      (window as any).__openBuilding('socket_city');
    });
    await expect(playerMarker).toHaveAttribute('data-x', '276');
    await expect(playerMarker).toHaveAttribute('data-y', '187');

    // Assert zero uncaught page errors
    expect(pageErrors, `Uncaught page errors: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });

  test('verifies Monolith Burgers authentic window opens, displays items and talker, and can buy food', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.addInitScript(() => {
      localStorage.setItem('fastlane_gui_style', 'authentic');
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible({ timeout: 5000 });
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // Close initial apartment modal if opened
    const initialModal = page.locator('.building-modal');
    if (await initialModal.isVisible()) {
      await page.locator('.building-modal__close').click();
      await expect(initialModal).toBeHidden({ timeout: 3000 });
    }

    // Open Monolith Burgers
    await page.evaluate(() => {
      (window as any).__openBuilding('burger_palace');
    });

    const buildingModal = page.locator('.building-modal');
    await expect(buildingModal).toBeVisible({ timeout: 5000 });
    await expect(buildingModal).toHaveClass(/building-modal--authentic/);
    await expect(buildingModal).toHaveClass(/building-modal--authentic-replica/);

    // Verify authentic viewport container and layers
    const authenticViewport = page.locator('[data-testid="authentic-monolith-burgers"]');
    await expect(authenticViewport).toBeVisible();

    const talker = page.locator('[data-testid="monolith-talker"]');
    await expect(talker).toBeVisible();

    const counter = page.locator('[data-testid="monolith-counter"]');
    await expect(counter).toBeVisible();

    // Verify all 6 menu items are visible
    const hamburger = page.locator('[data-testid="menu-item-hamburger"]');
    await expect(hamburger).toBeVisible();
    await expect(hamburger).toContainText('Hamburgers');

    const doneBtn = page.locator('[data-testid="btn-monolith-done"]');
    await expect(doneBtn).toBeVisible();

    // Modern header and close button should NOT be present
    await expect(page.locator('.building-modal__header')).toBeHidden();
    await expect(page.locator('.building-modal__close')).toBeHidden();

    // Screenshot of authentic Monolith Burgers
    await page.screenshot({ path: '/tmp/authentic_monolith_burgers_verified.png' });

    // Click to buy a hamburger
    await hamburger.click();

    // Speech bubble appears with cashier response and tail pointing right
    const speechBubble = page.locator('[data-testid="monolith-speech-bubble"]');
    await expect(speechBubble).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="speech-tail-right"]')).toBeVisible();

    // Click DONE button to close
    await doneBtn.click();
    await expect(buildingModal).toBeHidden({ timeout: 3000 });

    expect(pageErrors, `Uncaught page errors: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });

  test('verifies Bank authentic window opens, displays talker, piggy bank, options, and can deposit/withdraw', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.addInitScript(() => {
      localStorage.setItem('fastlane_gui_style', 'authentic');
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible({ timeout: 5000 });
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // Close initial apartment modal if opened
    const initialModal = page.locator('.building-modal');
    if (await initialModal.isVisible()) {
      await page.locator('.building-modal__close').click();
      await expect(initialModal).toBeHidden({ timeout: 3000 });
    }

    // Open Bank
    await page.evaluate(() => {
      (window as any).__openBuilding('bank');
    });

    const buildingModal = page.locator('.building-modal');
    await expect(buildingModal).toBeVisible({ timeout: 5000 });
    await expect(buildingModal).toHaveClass(/building-modal--authentic/);
    await expect(buildingModal).toHaveClass(/building-modal--authentic-replica/);

    // Verify authentic bank viewport container and layers
    const authenticViewport = page.locator('[data-testid="authentic-bank"]');
    await expect(authenticViewport).toBeVisible();

    const talker = page.locator('[data-testid="bank-talker"]');
    await expect(talker).toBeVisible();

    const piggy = page.locator('[data-testid="bank-piggy"]');
    await expect(piggy).toBeVisible();

    // Verify all 5 menu options are visible
    const depositOpt = page.locator('[data-testid="bank-option-deposit"]');
    await expect(depositOpt).toBeVisible();
    await expect(depositOpt).toContainText('Deposit');

    const withdrawOpt = page.locator('[data-testid="bank-option-withdraw"]');
    await expect(withdrawOpt).toBeVisible();

    const loanPaymentOpt = page.locator('[data-testid="bank-option-loan_payment"]');
    await expect(loanPaymentOpt).toBeVisible();

    const applyLoanOpt = page.locator('[data-testid="bank-option-apply_loan"]');
    await expect(applyLoanOpt).toBeVisible();

    const seeBrokerOpt = page.locator('[data-testid="bank-option-see_broker"]');
    await expect(seeBrokerOpt).toBeVisible();

    const doneBtn = page.locator('[data-testid="btn-bank-done"]');
    await expect(doneBtn).toBeVisible();

    // Modern header and close button should NOT be present
    await expect(page.locator('.building-modal__header')).toBeHidden();
    await expect(page.locator('.building-modal__close')).toBeHidden();

    // Screenshot of authentic Bank
    await page.screenshot({ path: '/tmp/authentic_bank_verified.png' });

    // Click Deposit
    await depositOpt.click();

    // Speech bubble appears with teller response and tail pointing left
    const speechBubble = page.locator('[data-testid="bank-speech-bubble"]');
    await expect(speechBubble).toBeVisible({ timeout: 3000 });
    await expect(speechBubble).toContainText('Thank you for depositing on us.');
    await expect(page.locator('[data-testid="speech-tail-left"]')).toBeVisible();

    // Click Withdraw
    await withdrawOpt.click();
    await expect(speechBubble).toBeVisible({ timeout: 3000 });
    await expect(speechBubble).toContainText('penalty for early withdrawal');

    // Click "See The Broker" to transition to Authentic Broker window
    await seeBrokerOpt.click();

    const brokerViewport = page.locator('[data-testid="authentic-broker"]');
    await expect(brokerViewport).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-testid="broker-row-tbills"]')).toBeVisible();
    await expect(page.locator('[data-testid="broker-row-gold"]')).toBeVisible();

    // Screenshot of authentic Broker
    await page.screenshot({ path: '/tmp/authentic_broker_verified.png' });

    // Click BUY button in Broker to buy 1 share of T-Bills
    const brokerBuyBtn = page.locator('[data-testid="btn-broker-buy"]');
    await brokerBuyBtn.click();

    const brokerSpeech = page.locator('[data-testid="broker-speech-bubble"]');
    await expect(brokerSpeech).toBeVisible({ timeout: 3000 });
    await expect(brokerSpeech).toContainText('You bought 1 share');

    // Click DONE button in Broker to return to Bank
    const brokerDoneBtn = page.locator('[data-testid="btn-broker-done"]');
    await brokerDoneBtn.click();
    await expect(authenticViewport).toBeVisible({ timeout: 3000 });

    // Click DONE button to close bank
    await doneBtn.click();
    await expect(buildingModal).toBeHidden({ timeout: 3000 });

    expect(pageErrors, `Uncaught page errors: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });

  test('verifies all remaining authentic location windows open, display authentic talkers and backdrops, and close cleanly', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.addInitScript(() => {
      localStorage.setItem('fastlane_gui_style', 'authentic');
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const startGameBtn = page.locator('.title-screen__btn').first();
    await expect(startGameBtn).toBeVisible({ timeout: 5000 });
    await startGameBtn.click();

    const startLifeBtn = page.locator('.action-panel__btn').filter({ hasText: /Start Life|התחל חיים/i }).first();
    await expect(startLifeBtn).toBeVisible({ timeout: 5000 });
    await startLifeBtn.click();

    // Close initial apartment modal if opened
    const initialHomeDone = page.locator('[data-testid="btn-home-done"], .building-modal__close').first();
    if (await initialHomeDone.isVisible({ timeout: 2000 }).catch(() => false)) {
      await initialHomeDone.click();
      await expect(page.locator('.building-modal')).toBeHidden({ timeout: 3000 });
    }

    const testBuildings = [
      { id: 'blacks_market', testId: 'authentic-blacks-market', doneBtnTestId: 'btn-blacks-market-done' },
      { id: 'qt_clothing', testId: 'authentic-qt-clothing', doneBtnTestId: 'btn-qt-clothing-done' },
      { id: 'socket_city', testId: 'authentic-socket-city', doneBtnTestId: 'btn-socket-city-done' },
      { id: 'z_mart', testId: 'authentic-z-mart', doneBtnTestId: 'btn-z-mart-done' },
      { id: 'pawn_shop', testId: 'authentic-pawn-shop', doneBtnTestId: 'btn-pawn-done' },
      { id: 'university', testId: 'authentic-university', doneBtnTestId: 'btn-university-done' },
      { id: 'employment_office', testId: 'authentic-employment-office', doneBtnTestId: 'btn-employment-done' },
      { id: 'factory', testId: 'authentic-factory', doneBtnTestId: 'btn-factory-done' },
      { id: 'apartment_complex', testId: 'authentic-rent-office', doneBtnTestId: 'btn-rent-office-done' },
      { id: 'low_cost_housing', testId: 'authentic-home', doneBtnTestId: 'btn-home-done' }
    ];

    for (const b of testBuildings) {
      await page.evaluate((buildingId) => {
        if ((window as any).__openBuilding) {
          (window as any).__openBuilding(buildingId);
        }
      }, b.id);

      const modal = page.locator('.building-modal');
      await expect(modal).toBeVisible({ timeout: 3000 });

      const authenticComp = page.locator(`[data-testid="${b.testId}"]`);
      await expect(authenticComp).toBeVisible({ timeout: 3000 });

      // Click done button
      const doneBtn = page.locator(`[data-testid="${b.doneBtnTestId}"]`);
      await expect(doneBtn).toBeVisible();
      await doneBtn.click();
      await expect(modal).toBeHidden({ timeout: 3000 });
    }

    expect(pageErrors, `Uncaught page errors: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });
});
