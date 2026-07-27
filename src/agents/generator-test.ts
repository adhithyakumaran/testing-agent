import { generateTest } from './generator';
import { scanPageSelectors, scanFlowSelectors, ScanConfig } from './dom-scanner';
import { flowRegistry } from './flows';
import { pool } from '../db/client';
import * as fs from 'fs';

// Usage: npx tsx src/agents/generator-test.ts <output-filename> <story-file> [url-to-scan | <app-name-from-flow-registry>]
// The third arg can be:
//   - omitted                → no selector scanning
//   - a URL                   → single-page scan
//   - a key from flowRegistry → full multi-step flow scan for that app (e.g. "saucedemo")
const outputName = process.argv[2];
const storyFile = process.argv[3];
const scanTarget = process.argv[4];

if (!outputName || !storyFile) {
  console.error('Usage: npx tsx src/agents/generator-test.ts <output-filename> <story-file> [url-to-scan | app-name]');
  process.exit(1);
}

const story = fs.readFileSync(storyFile, 'utf-8');
const fileName = `${outputName}.spec.ts`; // matches how Playwright reports "file" in results.json (no folder prefix)
const outputPath = `tests-generated/${fileName}`;

// Pulls out each test('...', ...) or test("...", ...) title from generated code.
// One test_cases row is needed per test() block, since healing_events looks up
// by individual test title (spec.title in Playwright's JSON), not by filename.
function extractTestTitles(code: string): string[] {
  const matches = [...code.matchAll(/test\(\s*(['"`])((?:(?!\1).)*)\1/g)];
  return matches
    .map((m) => m[2])
    .filter((title): title is string => typeof title === 'string');
}

// Derives a human-readable, mandatory "you must complete this sequence first"
// instruction block from ANY flow config, so the LLM can't skip auth/navigation
// steps just because a story didn't explicitly mention them. Heuristic:
// everything up to and including the FIRST waitForURL step is treated as the
// login sequence (that's the generic signal "you are now past authentication
// and on a real page"). Works identically regardless of which client app's
// flow config is passed in.
function describePrerequisiteSteps(flow: ScanConfig): string {
  const lines: string[] = [];
  for (const step of flow.steps) {
    if (step.action === 'fill') {
      lines.push(`Fill the element matching selector "${step.selector}" with the value "${step.value}".`);
    } else if (step.action === 'click') {
      lines.push(`Click the element matching selector "${step.selector}".`);
    } else if (step.action === 'waitForURL') {
      lines.push(`Wait for the page URL to match the pattern ${step.urlPattern}.`);
      break; // stop after the first waitForURL — that marks "login complete"
    }
  }
  return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

async function run() {
  let selectors: string[] | undefined;
  let startUrl: string | undefined;
  let mandatoryPrerequisiteSteps: string | undefined;

  const flowConfig = scanTarget ? flowRegistry[scanTarget] : undefined;

  if (flowConfig) {
    console.log(`Scanning full flow for app "${scanTarget}"...`);
    selectors = await scanFlowSelectors(flowConfig);
    startUrl = flowConfig.startUrl;
    mandatoryPrerequisiteSteps = describePrerequisiteSteps(flowConfig);
    console.log(`Found ${selectors.length} unique elements across the flow.\n`);
  } else if (scanTarget) {
    console.log(`Scanning ${scanTarget} for real selectors...`);
    selectors = await scanPageSelectors(scanTarget);
    startUrl = scanTarget;
    console.log(`Found ${selectors.length} elements with data-test attributes.\n`);
  }

  const code = await generateTest(story, selectors, startUrl, mandatoryPrerequisiteSteps);

  console.log('--- GENERATED TEST ---\n');
  console.log(code);

  fs.writeFileSync(outputPath, code);
  console.log(`\n--- Saved to ${outputPath} ---`);

  const testTitles = extractTestTitles(code);

  if (testTitles.length === 0) {
    console.warn(
      `WARNING: Could not find any test('...') titles in the generated code. ` +
      `This file will NOT be linked to healing_events — check the generated code manually.`
    );
  } else {
    console.log(`\nRegistering ${testTitles.length} test case(s) in the database...`);
    for (const title of testTitles) {
      try {
        await pool.query(
          `INSERT INTO test_cases (name, file_path, source_story, generated_by, app_name)
           VALUES ($1, $2, $3, $4, $5)`,
          [title, fileName, story, 'ai:groq', flowConfig ? scanTarget : 'saucedemo']
        );
        console.log(`  - Registered: "${title}"`);
      } catch (err) {
        console.error(`  - FAILED to register "${title}":`, err);
      }
    }
  }

  await pool.end();
}

run().catch(async (err) => {
  console.error('--- ERROR ---');
  console.error(err);
  await pool.end();
  process.exit(1);
});