import 'dotenv/config';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db/client';

const provider = process.env.LLM_PROVIDER || 'groq';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export async function askLLM(systemPrompt: string, userPrompt: string, caller: string = 'unknown'): Promise<string> {
  if (provider === 'groq') {
    const model = 'llama-3.3-70b-versatile';
    try {
      const res = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      await logCall(model, caller, res.usage?.prompt_tokens ?? null, res.usage?.completion_tokens ?? null, true, null);
      return res.choices[0]?.message?.content || '';
    } catch (err: any) {
      await logCall(model, caller, null, null, false, err?.message || 'Unknown error');
      throw err;
    }
  }

  if (provider === 'anthropic') {
    const model = 'claude-sonnet-4-6';
    try {
      const res = await anthropic.messages.create({
        model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      await logCall(model, caller, res.usage?.input_tokens ?? null, res.usage?.output_tokens ?? null, true, null);
      const block = res.content[0];
      return block?.type === 'text' ? block.text : '';
    } catch (err: any) {
      await logCall(model, caller, null, null, false, err?.message || 'Unknown error');
      throw err;
    }
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}