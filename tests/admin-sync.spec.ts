import { test, expect } from '@playwright/test';

test('admin queue changes sync to player and kiosk', async ({ browser, context }) => {
  // Shared storageState for localStorage sync—no reload needed
  const storageState = await context.storageState({ path: 'test-storage.json' });

  const adminContext = await browser.newContext({ storageState });
  const playerContext = await browser.newContext({ storageState });
  const kioskContext = await browser.newContext({ storageState });

  const adminPage = await adminContext.newPage();
  const playerPage = await playerContext.newPage();
  const kioskPage = await kioskContext.newPage();

  // Clear for clean slate
  await adminPage.addInitScript(() => localStorage.clear());

  // Navigate with test mode (bypasses auth, mocks sync via BroadcastChannel if added in code)
  await adminPage.goto('http://localhost:5173/admin?test=true');
  await playerPage.goto('http://localhost:5173/player?test=true');
  await kioskPage.goto('http://localhost:5173/kiosk?test=true');

  // Owner bypass visible
  await expect(adminPage.getByText('owner')).toBeVisible({ timeout: 2000 });

  // Admin: Search
  await adminPage.fill('input[placeholder="Search YouTube..."]', 'Bohemian Rhapsody');
  await adminPage.click('button:has-text("Search")');
  await adminPage.waitForSelector('[data-testid="search-result"]', { timeout: 5000 });
  await adminPage.click('text=Queen – Bohemian Rhapsody');

  // Priority high
  await adminPage.click('[data-testid="priority-select"]');
  await adminPage.click('text=High');

  // Add—triggers hook update + toast
  await adminPage.click('button:has-text("Add to Queue")');

  // Wait for Sonner toast (portal, role=alert; evaluate visibility if needed)
  await adminPage.waitForFunction(() => {
    const toast = document.querySelector('.toast');
    return toast && toast.textContent?.includes('Added');
  }, {}, { timeout: 5000 });

  await expect(adminPage.locator('.toast').filter({ hasText: 'Added' })).toBeVisible({ timeout: 3000 });

  // Wait for queue sync (DOM length >0; assumes BroadcastChannel or poll in test mode)
  await playerPage.waitForFunction(() => {
    return document.querySelectorAll('[data-testid="queue-item"]').length > 0;
  }, {}, { timeout: 8000 });

  await kioskPage.waitForFunction(() => {
    return document.querySelectorAll('[data-testid="up-next-item"]').length > 0;
  }, {}, { timeout: 8000 });

  // Player assertions
  await expect(playerPage.locator('[data-testid="marquee-text"]')).toContainText('Queen', { timeout: 3000 });
  await expect(playerPage.locator('iframe')).toBeVisible();
  await expect(playerPage.locator('iframe')).toHaveAttribute('src', /fJ9rUzIMcZQ/);
  await expect(playerPage.getByText('Queen – Bohemian Rhapsody')).toBeVisible();
  await expect(playerPage.locator('[data-testid="priority-badge"]').filter({ hasText: 'High' })).toHaveClass(/bg-red-500/);

  // Kiosk assertions
  await expect(kioskPage.locator('[data-testid="marquee-text"]')).toContainText('Queen', { timeout: 3000 });
  await expect(kioskPage.locator('iframe')).toBeVisible();
  await expect(kioskPage.locator('iframe')).toHaveAttribute('src', /fJ9rUzIMcZQ/);
  await expect(kioskPage.getByText('Queen – Bohemian Rhapsody')).toBeVisible();
  await expect(kioskPage.locator('[data-testid="priority-badge"]').filter({ hasText: 'High' })).toHaveClass(/bg-red-500/);

  // Owner remove visible
  await expect(adminPage.getByRole('button', { name: 'Remove' })).toBeVisible();

  // Quota/logs
  await expect(adminPage.getByText('YouTube API Quota')).toBeVisible();
  await expect(adminPage.getByText('Activity Logs')).toBeVisible();

  await adminContext.close();
  await playerContext.close();
  await kioskContext.close();
});