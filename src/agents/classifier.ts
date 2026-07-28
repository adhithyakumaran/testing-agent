import { askLLM } from '../llm';

export type FailureCategory =
  | 'selector_not_found'
  | 'assertion_mismatch'
  | 'timeout_unclear'
  | 'other';

export interface ClassificationResult {
  category: FailureCategory;
  reasoning: string;
  method: 'pattern' | 'llm'; // which path decided this, useful for debugging/trust
}

// Strips ANSI escape codes (Playwright embeds these in error text)
function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

// Fast, deterministic, free: try to classify from well-known Playwright error
// text shapes BEFORE spending an LLM call. Returns null if the shape is
// ambiguous or doesn't match anything recognized, so the caller can fall back.
export function classifyByPattern(errorMessage: string): ClassificationResult | null {
  const text = stripAnsi(errorMessage);

  // "expect(locator).toXXX failed" is Playwright's assertion-failure signature.
  const isAssertionFailure = /expect\(.*\)\.(toContainText|toHaveText|toEqual|toBe|toHaveValue|toBeVisible)/.test(text);

  if (isAssertionFailure) {
    // IMPORTANT: "waiting for locator" is Playwright's standard retry-log
    // header and appears in EVERY expect() call, whether the element was
    // ultimately found or not. It is NOT a reliable signal on its own.
    // The real signal that the element WAS found is "locator resolved to"
    // (Playwright prints the actual matched element there). If that's
    // present, this is a genuine content mismatch, not a missing selector.
    const elementWasFound = /locator resolved to/i.test(text);
    const explicitlyNotFound = /element\(s\) not found/i.test(text);

    if (elementWasFound && !explicitlyNotFound) {
      return {
        category: 'assertion_mismatch',
        reasoning: 'The element was found (Playwright logged "locator resolved to..."), but its content/value did not match what the test expected. Likely a real behavior difference or an incorrect expectation in the generated test.',
        method: 'pattern',
      };
    }

    if (explicitlyNotFound) {
      return {
        category: 'selector_not_found',
        reasoning: 'Assertion failed because the locator matched zero elements ("element(s) not found") — likely a stale/wrong selector, not a real content mismatch.',
        method: 'pattern',
      };
    }

    // Assertion failure shape, but neither "resolved to" nor "not found" is
    // present — genuinely ambiguous from text alone. Let the LLM fallback decide.
    return null;
  }

  // Generic timeout with a real data-test selector in the "waiting for locator" call log.
  const timeoutWithSelector = /Test timeout of \d+ms exceeded/.test(text) && /waiting for locator\(.*data-test=/.test(text);
  if (timeoutWithSelector) {
    return {
      category: 'selector_not_found',
      reasoning: 'The test timed out waiting for a specific data-test locator that never appeared.',
      method: 'pattern',
    };
  }

  // Generic timeout with NO selector info at all — could be a missing prior
  // step, network issue, or something else entirely. Genuinely ambiguous.
  const timeoutNoSelector = /Test timeout of \d+ms exceeded/.test(text) && !/data-test=/.test(text);
  if (timeoutNoSelector) {
    return null; // ambiguous — let the LLM fallback decide
  }

  return null; // doesn't match any known shape — let the LLM fallback decide
}

async function classifyByLLM(errorMessage: string): Promise<ClassificationResult> {
  const systemPrompt = `You are a QA triage assistant. You will be given a Playwright test error message.
Classify it into EXACTLY ONE of these categories:
- "selector_not_found": the test could not find an element (e.g. a locator that never appeared), possibly because a PRIOR step in the test failed to reach the expected page/state.
- "assertion_mismatch": the element was found, but an assertion about its content/value failed — a real behavior difference, not a missing element.
- "timeout_unclear": a timeout occurred but there isn't enough information to tell if it's a missing element, a network issue, or something else.
- "other": anything that doesn't fit the above (crashes, unexpected exceptions, etc.)

Respond ONLY with valid JSON, no markdown fences, no explanation outside the JSON, in exactly this shape:
{"category": "...", "reasoning": "..."}`;

  const userPrompt = `Classify this Playwright error:\n\n${stripAnsi(errorMessage)}`;

  const raw = await askLLM(systemPrompt, userPrompt, 'classifier');
  const clean = raw.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(clean);
    const validCategories: FailureCategory[] = ['selector_not_found', 'assertion_mismatch', 'timeout_unclear', 'other'];
    const category: FailureCategory = validCategories.includes(parsed.category) ? parsed.category : 'other';
    return {
      category,
      reasoning: parsed.reasoning || 'LLM classification (no reasoning returned).',
      method: 'llm',
    };
  } catch (err) {
    // If the LLM didn't return valid JSON, don't crash the whole pipeline —
    // fall back to the safest default: flag for human review.
    return {
      category: 'other',
      reasoning: `LLM classification failed to parse (raw response: ${raw.slice(0, 200)}).`,
      method: 'llm',
    };
  }
}

export async function classifyFailure(errorMessage: string): Promise<ClassificationResult> {
  const patternResult = classifyByPattern(errorMessage);
  if (patternResult) {
    return patternResult;
  }
  return classifyByLLM(errorMessage);
}