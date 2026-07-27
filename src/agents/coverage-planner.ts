import { askLLM } from '../llm';
import { scanFlowSelectors } from './dom-scanner';
import { flowRegistry } from './flows';
import { pool } from '../db/client';
import * as fs from 'fs';
import * as path from 'path';

// Usage: npx tsx src/agents/coverage-planner.ts <app-name>
// Example: npx tsx src/agents/coverage-planner.ts saucedemo
const appNameArg = process.argv[2];

if (!appNameArg) {
  console.error('Usage: npx tsx src/agents/coverage-planner.ts <app-name>');
  process.exit(1);
}

// Explicit annotation (not just inferred narrowing) so this stays a definite
// `string` even when referenced inside the run() closure below — narrowing
// from an outer `if` check doesn't carry into nested functions otherwise.
const appName: string = appNameArg;

const SYSTEM_PROMPT = `You are a senior QA engineer doing test coverage planning.
You will be given:
1. A list of real, grounded selectors from an application (so you know what actually exists — do not invent elements).
2. A list of user stories/test names that are ALREADY covered by existing automated tests.

Your job: propose NEW candidate test scenarios that are NOT already covered, focusing on:
- Missing/empty required fields (one at a time, not just the one already tested if any)
- Boundary or unusual input length (very long strings, very short/minimal values)
- Invalid formats where relevant (e.g. malformed postal codes, unusual characters)
- Negative paths a user might realistically hit (not security/penetration-testing scenarios — stick to realistic QA edge cases, not attack payloads)

Rules:
- Do NOT propose a scenario that duplicates or closely overlaps an already-covered story.
- Do NOT invent form fields or elements that aren't in the provided selector list.
- Respond ONLY with valid JSON, no markdown fences, no explanation outside the JSON, in exactly this shape:
{"suggestions": [{"title": "short kebab-case-ish filename-safe title", "story": "full plain-English user story, same style as: As a user on <app>, I want ... so that ..."}]}
Propose between 3 and 8 suggestions. Quality over quantity — skip anything that feels like a stretch or isn't realistically testable from the given selectors.`;

async function run() {
  const flowConfig = flowRegistry[appName];
  if (!flowConfig) {
    console.error(`No flow config found for app "${appName}". Available: ${Object.keys(flowRegistry).join(', ')}`);
    process.exit(1);
  }

  console.log(`Scanning "${appName}" flow for real selectors...`);
  const selectors = await scanFlowSelectors(flowConfig);
  console.log(`Found ${selectors.length} selectors.\n`);

  console.log('Loading existing test coverage from database...');
  const existing = await pool.query(
    `SELECT name FROM test_cases ORDER BY id;`
  );
  const existingTitles = existing.rows.map((r) => r.name);
  console.log(`Found ${existingTitles.length} existing test case(s).\n`);

  const userPrompt = `Grounded selectors for "${appName}":\n${selectors.join('\n')}\n\nAlready-covered test stories/names:\n${
    existingTitles.length > 0 ? existingTitles.map((t) => `- ${t}`).join('\n') : '(none yet)'
  }`;

  console.log('Asking the LLM to propose coverage gaps...\n');
  const raw = await askLLM(SYSTEM_PROMPT, userPrompt, 'coverage-planner');
  const clean = raw.replace(/```json|```/g, '').trim();

  let parsed: { suggestions: { title: string; story: string }[] };
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error('Failed to parse LLM response as JSON. Raw response was:\n', raw);
    await pool.end();
    process.exit(1);
  }

  if (!parsed.suggestions || parsed.suggestions.length === 0) {
    console.log('No coverage gap suggestions returned.');
    await pool.end();
    return;
  }

  const outputDir = 'stories/suggested';
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Writing ${parsed.suggestions.length} suggested story file(s) to ${outputDir}/ for human review:\n`);

  for (const suggestion of parsed.suggestions) {
    const safeTitle = suggestion.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filePath = path.join(outputDir, `${safeTitle}.txt`);
    fs.writeFileSync(filePath, suggestion.story);
    console.log(`  - ${filePath}`);
  }

  console.log(
    `\nThese are SUGGESTIONS only — nothing was auto-generated into tests-generated/ or the database.` +
    `\nReview each file, edit as needed, then run generator-test.ts on the ones worth keeping:` +
    `\n  npx tsx src/agents/generator-test.ts <output-name> ${outputDir}/<file>.txt ${appName}`
  );

  await pool.end();
}

run().catch(async (err) => {
  console.error('Coverage planning failed:', err);
  await pool.end();
  process.exit(1);
});