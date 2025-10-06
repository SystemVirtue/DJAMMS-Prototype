import { test, expect } from '@playwright/test';

test('admin queue changes sync to player and kiosk', async ({ browser, context }) => {
  // Use shared storageState for localStorage sync across pages
  const storageState = await context.storageState({ path: 'test-storage.json' });

  // Create pages with shared storage
  const adminContext = await browser.newContext({ storageState });
  const playerContext = await browser.newContext({ storageState });
  const kioskContext = await browser.newContext({ storageState });

  const adminPage = await adminContext.newPage();
  const playerPage = await playerContext.newPage();
  const kioskPage = await kioskContext.newPage();

  // Clear storage in init script for clean start
  await adminPage.addInitScript(() => localStorage.clear());

  // Navigate with test mode
  await adminPage.goto('http://localhost:5173/admin?test=true');
  await playerPage.goto('http://localhost:5173/player?test=true');
  await kioskPage.goto('http://localhost:5173/kiosk?test=true');

  // Verify owner login bypass
  await expect(adminPage.getByText('owner')).toBeVisible();

  // Admin: Search and add track
  await adminPage.fill('input[placeholder="Search YouTube..."]', 'Bohemian Rhapsody');
  await adminPage.click('button:has-text("Search")');
  await adminPage.waitForSelector('[data-testid="search-result"]', { timeout: 5000 });
  await adminPage.click('text=Queen – Bohemian Rhapsody');

  // Select high priority
  await adminPage.click('[data-testid="priority-select"]');
  await adminPage.click('text=High');

  // Add to queue (triggers BroadcastChannel mock in test mode)
  await adminPage.click('button:has-text("Add to Queue")');

  // Wait for add confirmation
  await expect(adminPage.getByText('Added to queue')).toBeVisible({ timeout: 3000 });

  // Wait for sync via custom function (checks queue length in DOM)
  await playerPage.waitForFunction(() => {
    const queueEl = document.querySelector('[data-testid="queue"]');
    return queueEl && queueEl.children.length > 0;
  }, {}, { timeout: 8000 });

  await kioskPage.waitForFunction(() => {
    const queueEl = document.querySelector('[data-testid="up-next"]');
    return queueEl && queueEl.children.length > 0;
  }, {}, { timeout: 8000 });

  // Assert Player: Marquee shows title
  await expect(playerPage.locator('[data-testid="marquee-text"]')).toContainText('Queen', { timeout: 5000 });

  // Player iframe loads
  await expect(playerPage.locator('iframe')).toBeVisible();
  await expect(playerPage.locator('iframe')).toHaveAttribute('src', /fJ9rUzIMcZQ/);

  // Player queue with high badge
  await expect(playerPage.getByText('Queen – Bohemian Rhapsody')).toBeVisible();
  await expect(playerPage.locator('[data-testid="priority-badge"]').getByText('High')).toBeVisible();

  // Assert Kiosk: Marquee
  await expect(kioskPage.locator('[data-testid="marquee-text"]')).toContainText('Queen', { timeout: 5000 });

  // Kiosk iframe
  await expect(kioskPage.locator('iframe')).toBeVisible();
  await expect(kioskPage.locator('iframe')).toHaveAttribute('src', /fJ9rUzIMcZQ/);

  // Kiosk queue with high badge
  await expect(kioskPage.getByText('Queen – Bohemian Rhapsody')).toBeVisible();
  await expect(kioskPage.locator('[data-testid="priority-badge"]').getByText('High')).toBeVisible();

  // Role: Owner sees remove
  await expect(adminPage.getByRole('button', { name: 'Remove' })).toBeVisible();

  // Quota and logs visible
  await expect(adminPage.getByText('YouTube API Quota')).toBeVisible();
  await expect(adminPage.getByText('Activity Logs')).toBeVisible();

  // Cleanup
  await adminContext.close();
  await playerContext.close();
  await kioskContext.close();
});