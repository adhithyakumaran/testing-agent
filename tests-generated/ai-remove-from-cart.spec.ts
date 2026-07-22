import { test, expect } from '@playwright/test';

test('can remove item from cart', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.fill('[data-test="username"]', 'standard_user');
  await page.fill('[data-test="password"]', 'secret_sauce');
  await page.click('[data-test="login-button"]');

  await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
  await page.click('[data-test="shopping_cart_container"]');

  expect(await page.innerText('[data-test="cart-quantity"]')).toBe('1');
  await page.click('[data-test="remove-sauce-labs-backpack"]');

  expect(await page.innerText('[data-test="cart-quantity"]')).toBe('0');
  expect(await page.innerText('[data-test="remove-sauce-labs-backpack"]')).toBe('');
});