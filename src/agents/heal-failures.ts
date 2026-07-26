import * as fs from 'fs';
import { pool } from '../db/client';
import { healSelector } from './healer';
import { scanFlowSelectors } from './dom-scanner';
import { classifyFailure } from './classifier';
import { flowRegistry } from './flows';

// NOTE: hardcoded to 'saucedemo' since it's the only client app configured
// today. Once there's more than one client app, this needs to look up which
// app a given failing test belongs to (e.g. store an "app" column on
// test_cases at generation time) instead of assuming a single flow.
const DEFAULT_FLOW_NAME = 'saucedemo';

// Strips ANSI color/escape codes Playwright embeds in error messages
// (e.g. \u001b[31m ... \u001b[39m) so regexes match cleanly against plain text.
function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

// Extracts a data-test selector from a Playwright error message, if present.
function extractBrokenSelector(errorMessage: string): string | null {
  const clean = stripAnsi(errorMessage);
  const match = clean.match(/\[data-test="([^"]+)"\]/);
  return match ? match[0] : null; // full `[data-test="login-btn"]`
}

async function healFailures() {
  const raw = fs.readFileSync('test-results/results.json', 'utf-8');
  const data = JSON.parse(raw);

  const failures: { testName: string; filePath: string; errorMessage: string }[] = [];

  function walk(suites: any[], filePath = '') {
    for (const suite of suites) {
      const currentFile = suite.file || filePath;
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests) {
            for (const result of test.results) {
              if (result.status !== 'passed' && result.errors?.length > 0) {
                const combinedText = result.errors
                  .map((e: any) => e.message || '')
                  .filter(Boolean)
                  .join('\n');

                failures.push({
                  testName: spec.title,
                  filePath: currentFile,
                  errorMessage: combinedText,
                });
              }
            }
          }
        }
      }
      if (suite.suites) walk(suite.suites, currentFile);
    }
  }
  walk(data.suites);

  if (failures.length === 0) {
    console.log('No failures found in latest test run. Nothing to heal.');
    await pool.end();
    return;
  }

  console.log(`Found ${failures.length} failure(s). Classifying and diagnosing...\n`);

  for (const failure of failures) {
    const classification = await classifyFailure(failure.errorMessage);

    console.log(`[${failure.testName}] Category: ${classification.category} (via ${classification.method})`);
    console.log(`Reasoning: ${classification.reasoning}`);

    const tc = await pool.query(
      'SELECT id FROM test_cases WHERE name = $1 AND file_path = $2',
      [failure.testName, failure.filePath]
    );
    const testCaseId = tc.rows[0]?.id || null;

    if (classification.category !== 'selector_not_found') {
      console.log(`Not a selector issue — logging for human triage, skipping healer.\n`);

      await pool.query(
        `INSERT INTO healing_events (test_case_id, old_selector, new_selector, confidence, reasoning, approved, failure_category, classification_reasoning)
         VALUES ($1, NULL, NULL, 'n/a', $2, false, $3, $4)`,
        [testCaseId, failure.errorMessage.slice(0, 2000), classification.category, classification.reasoning]
      );
      continue;
    }

    const brokenSelector = extractBrokenSelector(failure.errorMessage);

    if (!brokenSelector) {
      console.log(`Classifier flagged a selector issue, but no selector pattern was found in the error text — logging for human review.\n`);
      await pool.query(
        `INSERT INTO healing_events (test_case_id, old_selector, new_selector, confidence, reasoning, approved, failure_category, classification_reasoning)
         VALUES ($1, NULL, NULL, 'n/a', $2, false, $3, $4)`,
        [testCaseId, failure.errorMessage.slice(0, 2000), classification.category, 'Classifier expected a selector but none was extractable — needs manual review.']
      );
      continue;
    }

    console.log(`Broken selector detected: ${brokenSelector}`);
    console.log('Scanning current page for real selectors...');

    const flowConfig = flowRegistry[DEFAULT_FLOW_NAME];
    if (!flowConfig) {
      console.error(`No flow config found for "${DEFAULT_FLOW_NAME}" — cannot scan for healing. Skipping this failure.\n`);
      continue;
    }
    const currentSelectors = await scanFlowSelectors(flowConfig);
    const heal = await healSelector(brokenSelector, currentSelectors);

    console.log(`Result: ${heal.found ? 'MATCH FOUND' : 'NO MATCH'} (confidence: ${heal.confidence})`);
    console.log(`Reasoning: ${heal.reasoning}\n`);

    await pool.query(
      `INSERT INTO healing_events (test_case_id, old_selector, new_selector, confidence, reasoning, approved, failure_category, classification_reasoning)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7)`,
      [testCaseId, brokenSelector, heal.newSelector, heal.confidence, heal.reasoning, classification.category, classification.reasoning]
    );
  }

  console.log('All results logged to healing_events table (pending human approval/review).');
  await pool.end();
}

healFailures().catch((err) => {
  console.error('Healing process failed:', err);
  process.exit(1);
});