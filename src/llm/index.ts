import 'dotenv/config';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db/client';

const provider = process.env.LLM_PROVIDER || 'groq';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s backoff

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logCall(
  model: string,
  caller: string,
  inputTokens: number | null,
  outputTokens: number | null,
  success: boolean,
  errorMessage: string | null
) {
  try {
    await pool.query(
      `INSERT INTO llm_calls (provider, model, caller, input_tokens, output_tokens, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [provider, model, caller, inputTokens, outputTokens, success, errorMessage]
    );
  } catch (err) {
    console.error('Failed to log LLM call (non-fatal):', err);
  }
}

async function callGroq(systemPrompt: string, userPrompt: string, caller: string): Promise<string> {
  const model = 'llama-3.3-70b-versatile';
  const res = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  await logCall(model, caller, res.usage?.prompt_tokens ?? null, res.usage?.completion_tokens ?? null, true, null);
  return res.choices[0]?.message?.content || '';
}

async function callAnthropic(systemPrompt: string, userPrompt: string, caller: string): Promise<string> {
  const model = 'claude-sonnet-4-6';
  const res = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  await logCall(model, caller, res.usage?.input_tokens ?? null, res.usage?.output_tokens ?? null, true, null);
  const block = res.content[0];
  return block?.type === 'text' ? block.text : '';
}

export async function askLLM(systemPrompt: string, userPrompt: string, caller: string = 'unknown'): Promise<string> {
  const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'claude-sonnet-4-6';
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === 'groq') return await callGroq(systemPrompt, userPrompt, caller);
      if (provider === 'anthropic') return await callAnthropic(systemPrompt, userPrompt, caller);
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
    } catch (err: any) {
      lastError = err;
      const isLastAttempt = attempt === MAX_RETRIES;
      console.error(`[askLLM] Attempt ${attempt}/${MAX_RETRIES} failed for caller "${caller}": ${err?.message || err}`);

      if (isLastAttempt) {
        await logCall(model, caller, null, null, false, err?.message || 'Unknown error');
        throw new Error(`askLLM failed after ${MAX_RETRIES} attempts (caller: ${caller}): ${err?.message || err}`);
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}