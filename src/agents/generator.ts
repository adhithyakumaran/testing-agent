import { askLLM } from '../llm';

const SYSTEM_PROMPT = `You are a senior QA automation engineer who writes Playwright tests in TypeScript.

Rules you must follow:
- Output ONLY valid TypeScript code, no explanations, no markdown code fences.
- Use "import { test, expect } from '@playwright/test';" at the top.
- ALWAYS start the test with "await page.goto(...)" using the provided start URL. Never omit this step.
- ONLY use selectors from the "Available selectors" list provided to you. NEVER invent, guess, or assume a selector that isn't in that list.
- If the story requires an action you cannot map to any available selector, add a comment in the code: "// TODO: no selector found for <action> — needs clarification" instead of guessing.
- Write ONLY the test(s) needed to cover the user story given. Do NOT add extra tests for other elements just because they appear in the selector list — the selector list is reference material, not a checklist to cover.
- Always include meaningful assertions using expect() — never just click through steps with no verification.
- Write descriptive test names that state what is being verified.
- Keep tests focused: one logical flow per test() block.`;

export async function generateTest(
  userStory: string,
  availableSelectors?: string[],
  startUrl?: string
): Promise<string> {
  const selectorBlock = availableSelectors && availableSelectors.length > 0
    ? `\n\nAvailable selectors on this page (use ONLY these — do not invent others):\n${availableSelectors.join('\n')}`
    : '';

  const urlBlock = startUrl
    ? `\n\nStart URL for this test (use this in page.goto()): ${startUrl}`
    : '';

  const userPrompt = `Write a Playwright test for this user story:\n\n${userStory}${selectorBlock}${urlBlock}`;
  const result = await askLLM(SYSTEM_PROMPT, userPrompt);
  return result;
}