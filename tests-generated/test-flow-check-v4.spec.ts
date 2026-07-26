import { test, expect } from '@playwright/test';

test('should display error message when checking out with empty first name', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.fill('[data-test="username"]', 'standard_user');
  await page.fill('[data-test="password"]', 'secret_sauce');
  await page.click('[data-test="login-button"]');
  await page.waitForURL(/inventory\.html/);

  await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
  await page.click('[data-test="shopping-cart-link"]');
  await page.click('[data-test="checkout"]');

  await page.fill('[data-test="firstName"]', '');
  await page.fill('[data-test="lastName"]', 'some_last_name');
  await page.fill('[data-test="postalCode"]', '12345');
  await page.click('[data-test="continue"]');

  await expect(page.locator('[data-test="error"]')).toContainText('Error: First Name is required');
});