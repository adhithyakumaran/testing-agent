import { test, expect } from '@playwright/test';

test('should remove an item from cart', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.fill('input[data-test="username"]', 'standard_user');
  await page.fill('input[data-test="password"]', 'secret_sauce');
  await page.click('input[data-test="login-button"]');
  await page.click('button[data-test="add-to-cart-sauce-labs-backpack"]');
  await page.click('a[data-test="shopping-cart-link"]');
  await expect(page.locator('div[data-test="cart-contents-container"]')).toContainText('Sauce Labs Backpack');
  await page.click('button[data-test="remove-sauce-labs-backpack"]');
  await expect(page.locator('div[data-test="cart-contents-container"]')).not.toContainText('Sauce Labs Backpack');
});