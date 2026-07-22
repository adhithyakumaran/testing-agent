import { test, expect } from '@playwright/test';

test('Sorting products by name Z to A should display products in reverse alphabetical order', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();

  await page.locator('[data-test="product-sort-container"]').selectOption({ value: 'za' });

  const productNames = await page.locator('.inventory_item_name');
  const productNameTexts = await productNames.allTextContents();

  const sortedProductNames = [...productNameTexts].sort((a, b) => b.localeCompare(a));
  expect(sortedProductNames).toEqual(productNameTexts);
});