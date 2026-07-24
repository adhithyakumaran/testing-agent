import { healSelector } from './healer';
import { scanPageSelectors } from './dom-scanner';

async function run() {
  // Simulate: the test expects an old selector name that no longer exists
  const brokenSelector = '[data-test="login-btn"]'; // pretend the real app renamed this
  const realSelectors = await scanPageSelectors('https://www.saucedemo.com/');

  console.log(`Broken selector: ${brokenSelector}`);
  console.log(`Scanned ${realSelectors.length} real selectors from the page.\n`);

  const result = await healSelector(brokenSelector, realSelectors);
  console.log('--- HEALING RESULT ---');
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);