import { askLLM } from '../llm';

const SYSTEM_PROMPT = `You are a senior QA automation engineer who writes Playwright tests in TypeScript.

Rules you must follow:
- Output ONLY valid TypeScript code, no explanations, no markdown code fences.
- Use "import { test, expect } from '@playwright/test';" at the top.
- Use data-test attributes for selectors when the user provides them (e.g. [data-test="login-button"]).
- Always include meaningful assertions using expect() — never just click through steps with no verification.
- Write descriptive test names that state what is being verified.
- Keep tests focused: one logical flow per test() block.`;

export async function generateTest(userStory: string): Promise<string> {
  const userPrompt = `Write a Playwright test for this user story:\n\n${userStory}`;
  const result = await askLLM(SYSTEM_PROMPT, userPrompt);
  return result;
}