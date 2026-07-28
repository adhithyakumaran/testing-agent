import { classifyByPattern } from './classifier';

interface EvalCase {
  name: string;
  errorMessage: string;
  expectedCategory: string | null; // null means "should NOT match a pattern, must fall to LLM"
}

const cases: EvalCase[] = [
  {
    name: 'Real content mismatch (element found, wrong text) - regression test for bug #9',
    errorMessage: `Error: expect(locator).toContainText(expected) failed
Locator: locator('[data-test="error"]')
Expected substring: "Error: Last Name is required"
Call log:
  - waiting for locator('[data-test="error"]')
  - locator resolved to <h3 data-test="error">Error: First Name is required</h3>`,
    expectedCategory: 'assertion_mismatch',
  },
  {
    name: 'Assertion failure, locator genuinely not found',
    errorMessage: `Error: expect(locator).toContainText(expected) failed
Locator: locator('[data-test="error"]')
Call log:
  - waiting for locator('[data-test="error"]')
  - element(s) not found`,
    expectedCategory: 'selector_not_found',
  },
  {
    name: 'Timeout with a real data-test selector in the call log',
    errorMessage: `Test timeout of 30000ms exceeded.
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-test="firstName-broken"]')`,
    expectedCategory: 'selector_not_found',
  },
  {
    name: 'Timeout with NO selector info at all - genuinely ambiguous',
    errorMessage: `Test timeout of 30000ms exceeded.
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "https://example.com"`,
    expectedCategory: null,
  },
  {
    name: 'THE CRITICAL REGRESSION TEST: assertion failure where "waiting for locator" appears (as it does in EVERY assert) but neither "resolved to" nor "not found" is present - must NOT be misclassified, must fall through to LLM',
    errorMessage: `Error: expect(locator).toContainText(expected) failed
Locator: locator('[data-test="error"]')
Expected substring: "Error: Last Name is required"
Timeout: 5000ms
Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('[data-test="error"]')`,
    expectedCategory: null,
  },
  {
    name: 'Completely unrecognized error shape',
    errorMessage: `TypeError: Cannot read properties of undefined (reading 'foo')`,
    expectedCategory: null,
  },
];

function runEval() {
  console.log(`Running classifier pattern eval — ${cases.length} cases\n`);
  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    const result = classifyByPattern(c.errorMessage);
    const actualCategory = result ? result.category : null;
    const isPass = actualCategory === c.expectedCategory;

    if (isPass) {
      passed++;
      console.log(`PASS — ${c.name}`);
    } else {
      failed++;
      console.log(`FAIL — ${c.name}`);
      console.log(`  Expected: ${c.expectedCategory ?? 'null (fall through to LLM)'}`);
      console.log(`  Actual:   ${actualCategory ?? 'null (fell through to LLM)'}`);
    }
  }

  console.log(`\n${passed}/${cases.length} passed.`);
  if (failed > 0) {
    console.log(`${failed} FAILED — classifier pattern logic has regressed.`);
    process.exit(1);
  } else {
    console.log('All classifier pattern eval cases passed.');
  }
}

runEval();