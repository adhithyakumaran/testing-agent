import { healSelector } from './healer';

interface EvalCase {
  name: string;
  brokenSelector: string;
  currentSelectors: string[];
  expectedNewSelector: string | null; // null = expect found:false / no match
  minConfidence?: 'high' | 'medium' | 'low'; // only checked when expectedNewSelector is not null
}

const cases: EvalCase[] = [
  {
    name: 'Real proven case: firstName-broken -> firstName (verified multiple times this session)',
    brokenSelector: '[data-test="firstName-broken"]',
    currentSelectors: [
      'input[data-test="firstName"] — text: ""',
      'input[data-test="lastName"] — text: ""',
      'input[data-test="postalCode"] — text: ""',
      'button[data-test="continue"] — text: "Continue"',
      'button[data-test="checkout"] — text: "Checkout"',
    ],
    expectedNewSelector: 'input[data-test="firstName"]',
    minConfidence: 'high',
  },
  {
    name: 'Real proven case: checkout-x -> checkout (Sprint 3 original verification)',
    brokenSelector: '[data-test="checkout-x"]',
    currentSelectors: [
      'button[data-test="checkout"] — text: "Checkout"',
      'a[data-test="shopping-cart-link"] — text: ""',
      'button[data-test="continue"] — text: "Continue"',
    ],
    expectedNewSelector: 'button[data-test="checkout"]',
    minConfidence: 'high',
  },
  {
    name: 'No plausible match exists on the page - should NOT force a fake match',
    brokenSelector: '[data-test="totally-unrelated-widget-xyz"]',
    currentSelectors: [
      'input[data-test="username"] — text: ""',
      'input[data-test="password"] — text: ""',
      'button[data-test="login-button"] — text: "Login"',
    ],
    expectedNewSelector: null,
  },
];

const CONFIDENCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 };

async function runEval() {
  console.log(`Running healer eval — ${cases.length} cases, makes REAL LLM calls (costs tokens)\n`);

  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    const result = await healSelector(c.brokenSelector, c.currentSelectors);

    let isPass: boolean;
    let detail = '';

    if (c.expectedNewSelector === null) {
      // Expect it to NOT force a confident match
      isPass = !result.found || result.confidence === 'low' || result.confidence === 'none';
      if (!isPass) {
        detail = `Expected no confident match, but got found=${result.found}, confidence=${result.confidence}, newSelector=${result.newSelector}`;
      }
    } else {
      const selectorMatches = result.newSelector?.includes(c.expectedNewSelector) ?? false;
      const minRank = CONFIDENCE_RANK[c.minConfidence || 'low']??0;
      const actualRank = CONFIDENCE_RANK[result.confidence] ?? 0;
      isPass = result.found && selectorMatches && actualRank >= minRank;
      if (!isPass) {
        detail = `Expected newSelector containing "${c.expectedNewSelector}" at >=${c.minConfidence} confidence. Got: found=${result.found}, newSelector=${result.newSelector}, confidence=${result.confidence}`;
      }
    }

    if (isPass) {
      passed++;
      console.log(`PASS — ${c.name}`);
      console.log(`  -> ${result.newSelector || '(no match)'} [${result.confidence}]`);
    } else {
      failed++;
      console.log(`FAIL — ${c.name}`);
      console.log(`  ${detail}`);
    }
  }

  console.log(`\n${passed}/${cases.length} passed.`);
  if (failed > 0) {
    console.log(`${failed} FAILED — healer matching logic has regressed.`);
    process.exit(1);
  } else {
    console.log('All healer eval cases passed.');
  }
}

runEval();