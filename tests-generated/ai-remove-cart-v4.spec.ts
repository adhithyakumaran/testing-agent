import { test, expect } from '@playwright/test';

test('should remove an item from the cart', async ({ page }) => {
  // Login to the application
  await page.fill('input[data-test="username"]', 'standard_user');
  await page.fill('input[data-test="password"]', 'secret_sauce');
  await page.click('input[data-test="login-button"]');

  // Add an item to the cart
  await page.click('button[data-test="add-to-cart-sauce-labs-backpack"]');

  // Navigate to the cart
  await page.click('a[data-test="shopping-cart-link"]');

  // Verify the item is in the cart
  await expect(page.locator('div[data-test="cart-contents-container"]')).toContainText('Sauce Labs Backpack');

  // Remove the item from the cart
  await page.click('button[data-test="remove-sauce-labs-backpack"]');

  // Verify the item is no longer in the cart
  await expect(page.locator('div[data-test="cart-contents-container"]')).not.toContainText('Sauce Labs Backpack');
});