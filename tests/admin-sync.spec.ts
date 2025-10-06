import { test, expect } from '@playwright/test';

test('admin sync e2e', async ({ browser }) => {
  // Create three tabs
  const adminPage = await browser.newPage();
  const playerPage = await browser.newPage();
  const kioskPage = await browser.newPage();

  // Navigate to pages
  await adminPage.goto('http://localhost:5173/admin');
  await playerPage.goto('http://localhost:5173/player');
  await kioskPage.goto('http://localhost:5173/kiosk');

  // Admin: Login (assume owner role)
  await adminPage.fill('input[type="email"]', 'owner@example.com');
  await adminPage.click('button:has-text("Login")');
  // Note: In real test, handle email link

  // Check role display
  await expect(adminPage.locator('text=Role: owner')).toBeVisible();

  // Admin: Search and add track
  await adminPage.fill('input[placeholder="Search YouTube..."]', 'Bohemian Rhapsody');
  await adminPage.click('button:has-text("Search")');
  await adminPage.waitForSelector('text=Bohemian Rhapsody');
  await adminPage.click('text=Bohemian Rhapsody');
  await adminPage.selectOption('select', 'high');
  await adminPage.click('button:has-text("Add to Queue")');

  // Assert in Player
  await expect(playerPage.locator('iframe')).toBeVisible({ timeout: 5000 });
  await expect(playerPage.frameLocator('iframe').locator('text=Bohemian Rhapsody')).toBeVisible({ timeout: 5000 });

  // Assert in Kiosk
  await expect(kioskPage.locator('text=Bohemian Rhapsody')).toBeVisible();
  await expect(kioskPage.locator('.bg-red-600:has-text("high")')).toBeVisible();

  // Test role restrictions: Owner can remove, staff cannot
  await expect(adminPage.locator('button:has-text("Remove")')).toBeVisible();

  // Test local search toggle (if implemented)
  // await adminPage.check('input[type="checkbox"][name="localSearch"]'); // Assuming toggle exists
});