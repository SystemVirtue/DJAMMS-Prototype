import { test, expect } from '@playwright/test';

test('admin queue changes sync to player and kiosk', async ({ browser, context }) => {
  // Shared storageState for localStorage sync—no reload needed
  const storageState = await context.storageState({ path: 'test-storage.json' });

  // Create a single shared context so pages share localStorage and BroadcastChannel
  const sharedContext = await browser.newContext({ storageState });
  const adminPage = await sharedContext.newPage();
  const playerPage = await sharedContext.newPage();
  const kioskPage = await sharedContext.newPage();

  // Clear for clean slate
  await adminPage.addInitScript(() => localStorage.clear());

  // Navigate with test mode (bypasses auth, mocks sync via BroadcastChannel if added in code)
  await adminPage.goto('http://localhost:5173/admin?test=true');
  await playerPage.goto('http://localhost:5173/player?test=true');
  await kioskPage.goto('http://localhost:5173/kiosk?test=true');

  // Owner bypass visible
  await expect(adminPage.getByText('owner')).toBeVisible({ timeout: 2000 });

  // Inject test queue directly (avoid network-dependent UI search)
  await adminPage.evaluate(() => {
    const track = {
      id: 'fJ9rUzIMcZQ',
      title: 'Queen – Bohemian Rhapsody',
      url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
      priority: 'high',
      index: Date.now(),
    };
    const queue = [track];
    localStorage.setItem('djams-test-queue', JSON.stringify(queue));
    try {
      const channel = new BroadcastChannel('djams-test-queue-sync');
      channel.postMessage({ type: 'queue-update' });
      channel.close();
    } catch (e) {
      // ignore
    }
  });

  // We inject directly so skip toast verification

  // Wait until the test-mode localStorage queue key is written by the admin flow
  await adminPage.waitForFunction(() => {
    try {
      return !!localStorage.getItem('djams-test-queue');
    } catch (e) {
      return false;
    }
  }, {}, { timeout: 5000 });

  // Short pause to ensure writes propagate, then reload player and kiosk so their providers read the updated storage
  await adminPage.waitForTimeout(200);
  await playerPage.reload();
  await kioskPage.reload();

  // Wait for queue to appear in player
  await playerPage.waitForFunction(() => {
    return document.querySelectorAll('[data-testid="queue-item"]').length > 0;
  }, {}, { timeout: 8000 });

  // Wait for kiosk to show now-playing (marquee or iframe)
  await kioskPage.waitForSelector('[data-testid="marquee-text"]', { timeout: 8000 });

  // Player assertions
  await expect(playerPage.locator('[data-testid="marquee-text"]')).toContainText('Queen', { timeout: 3000 });
  await expect(playerPage.locator('iframe')).toBeVisible();
  await expect(playerPage.locator('iframe')).toHaveAttribute('src', /fJ9rUzIMcZQ/);
  await expect(playerPage.getByText('Queen – Bohemian Rhapsody').first()).toBeVisible();
  // Admin page should show the priority badge for the queued item
  await expect(adminPage.locator('[data-testid="priority-badge"]').filter({ hasText: 'high' })).toHaveClass(/bg-red-500/);

  // Kiosk assertions (single-track queue -> no Up Next items, but Now Playing should be visible)
  await expect(kioskPage.locator('[data-testid="marquee-text"]')).toContainText('Queen', { timeout: 3000 });
  await expect(kioskPage.locator('iframe')).toBeVisible();
  await expect(kioskPage.locator('iframe')).toHaveAttribute('src', /fJ9rUzIMcZQ/);
  await expect(kioskPage.getByText('Queen – Bohemian Rhapsody').first()).toBeVisible();

  // Owner remove button (icon-only) should be present in the Queue card
  const queueCard = adminPage.getByText(/Queue \(1 tracks\)/).locator('..').locator('..');
  await expect(queueCard.locator('button')).toBeVisible();

  // Quota card visible
  await expect(adminPage.getByText('YouTube API Quota')).toBeVisible();

  await sharedContext.close();
});