import { generateTest } from './generator';
import { scanPageSelectors, scanFlowSelectors } from './dom-scanner';
import { saucedemoFlow } from './flows/saucedemo-flow';
import * as fs from 'fs';

// Usage: npx tsx src/agents/generator-test.ts <output-filename> <story-file> [url-to-scan | "flow"]
const outputName = process.argv[2];
const storyFile = process.argv[3];
const scanTarget = process.argv[4]; // optional: a URL, or the literal word "flow"

if (!outputName || !storyFile) {
  console.error('Usage: npx tsx src/agents/generator-test.ts <output-filename> <story-file> [url-to-scan | "flow"]');
  process.exit(1);
}

const story = fs.readFileSync(storyFile, 'utf-8');
const outputPath = `tests-generated/${outputName}.spec.ts`;

async function run() {
  let selectors: string[] | undefined;
  let startUrl: string | undefined;

  if (scanTarget === 'flow') {
    console.log('Scanning full flow (login → inventory → cart → checkout)...');
    selectors = await scanFlowSelectors(saucedemoFlow);
    startUrl = saucedemoFlow.startUrl;
    console.log(`Found ${selectors.length} unique elements across the flow.\n`);
  } else if (scanTarget) {
    console.log(`Scanning ${scanTarget} for real selectors...`);
    selectors = await scanPageSelectors(scanTarget);
    startUrl = scanTarget;
    console.log(`Found ${selectors.length} elements with data-test attributes.\n`);
  }

  const code = await generateTest(story, selectors, startUrl);
  console.log('--- GENERATED TEST ---\n');
  console.log(code);
  fs.writeFileSync(outputPath, code);
  console.log(`\n--- Saved to ${outputPath} ---`);
}

run().catch((err) => {
  console.error('--- ERROR ---');
  console.error(err);
});