import { test, expect } from '@playwright/test';

test('checkout flow completes successfully', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();

  await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
  await page.locator('[data-test="add-to-cart-sauce-labs-bike-light"]').click();

  // cart badge should show 2 items added
  await expect(page.locator('.shopping_cart_badge')).toHaveText('2');

  await page.locator('[data-test="shopping-cart-link"]').click();
  await expect(page).toHaveURL(/cart.html/);
  await expect(page.locator('.cart_item')).toHaveCount(2);

  await page.locator('[data-test="checkout"]').click();
  await page.locator('[data-test="firstName"]').fill('Test');
  await page.locator('[data-test="lastName"]').fill('User');
  await page.locator('[data-test="postalCode"]').fill('600001');
  await page.locator('[data-test="continue"]').click();

  // overview page should show before finishing
  await expect(page).toHaveURL(/checkout-step-two.html/);
  await expect(page.locator('.summary_total_label')).toBeVisible();

  await page.locator('[data-test="finish"]').click();

  // order confirmation
  await expect(page).toHaveURL(/checkout-complete.html/);
  await expect(page.locator('.complete-header')).toHaveText('Thank you for your order!');
});

test('cart is empty by default', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  await expect(page.locator('.shopping_cart_badge')).toHaveCount(0);
});