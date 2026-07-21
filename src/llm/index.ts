import 'dotenv/config';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';

const provider = process.env.LLM_PROVIDER || 'groq';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function askLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (provider === 'groq') {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    return res.choices[0]?.message?.content || '';
  }

  if (provider === 'anthropic') {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = res.content[0];
    return block?.type === 'text' ? block.text : '';
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}