import { test, expect } from '@playwright/test';

test('should display error message when checking out with empty first name field', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.click('[data-test="add-to-cart"]'); // assuming add-to-cart button has this data-test attribute
  await page.click('[data-test="checkout"]');
  await page.fill('[data-test="lastName"]', 'Last Name');
  await page.fill('[data-test="postalCode"]', '12345');
  await page.click('[data-test="continue"]');
  await expect(page.locator('[data-test="error"]')).toContainText('Error: First Name is required');
});