import { ScanConfig } from '../dom-scanner';

export const saucedemoFlow: ScanConfig = {
  startUrl: 'https://www.saucedemo.com/',
  steps: [
    { action: 'fill', selector: '[data-test="username"]', value: 'standard_user' },
    { action: 'fill', selector: '[data-test="password"]', value: 'secret_sauce' },
    { action: 'click', selector: '[data-test="login-button"]' },
    { action: 'waitForURL', urlPattern: /inventory.html/ },
    { action: 'click', selector: '[data-test="add-to-cart-sauce-labs-backpack"]' },
    { action: 'click', selector: '[data-test="shopping-cart-link"]' },
    { action: 'waitForURL', urlPattern: /cart.html/ },
    { action: 'click', selector: '[data-test="checkout"]' },
    { action: 'waitForURL', urlPattern: /checkout-step-one.html/ },
  ],
};