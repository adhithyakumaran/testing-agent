import { generateTest } from './generator';
import * as fs from 'fs';

const story = `
As a user on saucedemo.com, I want to be able to sort products by price (low to high)
so that I can find the cheapest items first.

Details:
- The sort dropdown has data-test="product-sort-container"
- Selecting "lohi" sorts by price low to high
- Product prices are shown in elements with class "inventory_item_price"
- User must be logged in first (username: standard_user, password: secret_sauce, 
  login fields: data-test="username", data-test="password", data-test="login-button")
`;

generateTest(story)
  .then((code) => {
    console.log('--- GENERATED TEST ---\n');
    console.log(code);
    fs.writeFileSync('tests-generated/ai-generated-sort.spec.ts', code);
    console.log('\n--- Saved to tests-generated/ai-generated-sort.spec.ts ---');
  })
  .catch((err) => {
    console.error('--- ERROR ---');
    console.error(err);
  });