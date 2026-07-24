import { askLLM } from '../llm';

export interface HealResult {
  found: boolean;
  newSelector?: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reasoning: string;
}

const HEALER_SYSTEM_PROMPT = `You are a QA automation engineer diagnosing a broken test selector.

A Playwright test failed because a selector could not be found on the page. You will be given:
1. The broken selector the test was looking for
2. The current list of real selectors available on the page

Your job: find the selector on the current list that most likely replaces the broken one — same purpose, similar naming, similar visible text.

Respond ONLY in valid, strict JSON — double quotes only, no single quotes, no markdown code fences, no text outside the JSON object. Exact format:
{
  "found": true or false,
  "newSelector": "the exact matching selector string, or null if no good match exists",
  "confidence": "high" or "medium" or "low" or "none",
  "reasoning": "one sentence explaining why this is likely the same element, or why nothing matched"
}

Rules:
- "high" confidence: near-identical name/purpose (e.g. "login-btn" -> "login-button")
- "medium" confidence: plausible match but naming changed significantly
- "low" confidence: a guess, multiple candidates were similarly plausible
- "none": nothing on the page resembles the broken selector — do not force a match`;

export async function healSelector(
  brokenSelector: string,
  currentPageSelectors: string[]
): Promise<HealResult> {
  const userPrompt = `Broken selector: ${brokenSelector}

Current real selectors on the page:
${currentPageSelectors.join('\n')}`;

  const raw = await askLLM(HEALER_SYSTEM_PROMPT, userPrompt);

  try {
    let cleaned = raw.trim()
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '');

    // fallback fix: some models return single-quoted string values instead of double-quoted
    cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');

    const parsed = JSON.parse(cleaned);

    return {
      found: !!parsed.found,
      newSelector: parsed.newSelector ?? null,
      confidence: parsed.confidence ?? 'none',
      reasoning: parsed.reasoning ?? '',
    };
  } catch (err) {
    return {
      found: false,
      newSelector: null,
      confidence: 'none',
      reasoning: `Failed to parse LLM response: ${raw}`,
    };
  }
}