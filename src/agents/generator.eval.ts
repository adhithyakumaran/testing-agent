import { generateTest } from './generator';

interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string | undefined;
}

async function runEval() {
  console.log('Running generator output eval — this makes REAL LLM calls (costs tokens)\n');

  const checks: CheckResult[] = [];

  // --- Test 1: mandatory login must appear even when story omits it entirely ---
  // Regression test for bug #3 (silent missing-login bug)
  const storyWithoutLogin = 'User should see an error message when checking out with an empty last name.';
  const mandatorySteps = 'Fill [data-test="username"] with "standard_user". Fill [data-test="password"] with "secret_sauce". Click [data-test="login-button"]. Wait for URL matching /inventory\\.html/.';
  const availableSelectors = [
    'input[data-test="username"]',
    'input[data-test="password"]',
    'button[data-test="login-button"]',
    'button[data-test="checkout"]',
    'input[data-test="firstName"]',
    'input[data-test="postalCode"]',
    'button[data-test="continue"]',
    'h3[data-test="error"]',
  ];

  const codeWithMandatory = await generateTest(
    storyWithoutLogin,
    availableSelectors,
    'https://www.saucedemo.com/',
    mandatorySteps
  );

  const hasLoginFill = /fill\(['"]standard_user['"]\)/i.test(codeWithMandatory) || /username/i.test(codeWithMandatory);
  checks.push({
    name: 'Mandatory login steps present even though story never mentions login (bug #3 regression)',
    pass: hasLoginFill,
    detail: hasLoginFill ? undefined : 'No login/username fill found in generated code.',
  });

  // --- Test 2: waitForURL must use a real regex literal, not a quoted string ---
  // Regression test for bug #7
  const hasRealRegexLiteral = /waitForURL\(\s*\/[^'"]/i.test(codeWithMandatory);
  const hasQuotedFakeRegex = /waitForURL\(\s*['"]\//i.test(codeWithMandatory);
  checks.push({
    name: 'waitForURL uses a real regex literal, not a quoted string (bug #7 regression)',
    pass: hasRealRegexLiteral && !hasQuotedFakeRegex,
    detail: hasQuotedFakeRegex ? 'Found a quoted-string fake regex passed to waitForURL.' : (!hasRealRegexLiteral ? 'No waitForURL call found at all, or no real regex literal used.' : undefined),
  });

  // --- Test 3: all expect() calls must wrap page.locator(...), never a raw string ---
  // Regression test for bug #10
  const rawStringExpect = /expect\(\s*['"][^'"]*['"]\s*\)/i.test(codeWithMandatory);
  checks.push({
    name: 'No expect() called directly on a raw string selector (bug #10 regression)',
    pass: !rawStringExpect,
    detail: rawStringExpect ? 'Found expect() called on a raw string instead of page.locator(...).' : undefined,
  });

  // --- Report ---
  console.log('--- Generated code under test ---');
  console.log(codeWithMandatory);
  console.log('--- End generated code ---\n');

  let failed = 0;
  for (const c of checks) {
    if (c.pass) {
      console.log(`PASS — ${c.name}`);
    } else {
      failed++;
      console.log(`FAIL — ${c.name}`);
      if (c.detail) console.log(`  ${c.detail}`);
    }
  }

  console.log(`\n${checks.length - failed}/${checks.length} passed.`);
  if (failed > 0) {
    console.log(`${failed} FAILED — generator has regressed on a previously-fixed bug.`);
    process.exit(1);
  } else {
    console.log('All generator eval checks passed.');
  }
}

runEval();