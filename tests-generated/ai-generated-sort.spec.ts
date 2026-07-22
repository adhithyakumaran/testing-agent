import { test, expect } from '@playwright/test';

test('should display products sorted by price low to high', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');

  await page.fill('[data-test="username"]', 'standard_user');
  await page.fill('[data-test="password"]', 'secret_sauce');
  await page.click('[data-test="login-button"]');

  await page.selectOption('[data-test="product-sort-container"]', 'lohi');

  const prices = await page.$$eval('.inventory_item_price', (elements) => elements.map((element) => element.textContent));
  const pricesAsNumbers = prices.map((price) => parseFloat(price.replace('$', '')));
  const sortedPrices = [...pricesAsNumbers].sort((a, b) => a - b);

  expect(pricesAsNumbers).toEqual(sortedPrices);
});