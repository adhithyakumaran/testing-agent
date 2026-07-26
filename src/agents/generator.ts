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
- Keep tests focused: one logical flow per test() block.
- If "Mandatory prerequisite steps" are provided below, you MUST perform them, in order, as the very first actions in the test — even if the story does not mention them, does not imply them, or seems to start from a later point in the app. Never assume the story's starting point is already authenticated/reachable unless these steps are explicitly satisfied first.
- When calling page.waitForURL(...), always pass a REAL JavaScript regex literal, e.g. page.waitForURL(/inventory\\.html/) — never a quoted string version of a regex like page.waitForURL('/inventory.html/'). A quoted string is treated as a literal URL/glob match, not a pattern, and will silently fail to match.
- ALWAYS wrap a selector in page.locator(...) before calling expect() on it. Correct: await expect(page.locator('[data-test="error"]')).toContainText('...'); INCORRECT and will crash: await expect('[data-test="error"]').toContainText('...'). expect() assertions like toContainText, toHaveText, toBeVisible, etc. only work on a Locator object, never on a raw selector string.`;

export async function generateTest(
  userStory: string,
  availableSelectors?: string[],
  startUrl?: string,
  mandatoryPrerequisiteSteps?: string
): Promise<string> {
  const selectorBlock = availableSelectors && availableSelectors.length > 0
    ? `\n\nAvailable selectors on this page (use ONLY these — do not invent others):\n${availableSelectors.join('\n')}`
    : '';

  const urlBlock = startUrl
    ? `\n\nStart URL for this test (use this in page.goto()): ${startUrl}`
    : '';

  const prerequisiteBlock = mandatoryPrerequisiteSteps
    ? `\n\nMandatory prerequisite steps (must be the first actions in the test, regardless of what the story says):\n${mandatoryPrerequisiteSteps}`
    : '';

  const userPrompt = `Write a Playwright test for this user story:\n\n${userStory}${selectorBlock}${urlBlock}${prerequisiteBlock}`;

  const result = await askLLM(SYSTEM_PROMPT, userPrompt);
  return result;
}