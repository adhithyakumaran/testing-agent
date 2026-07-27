import { pool } from './db/client';

async function checkLLMCalls() {
  const res = await pool.query(
    `SELECT id, caller, model, input_tokens, output_tokens, success, created_at
     FROM llm_calls ORDER BY id DESC LIMIT 10;`
  );
  console.log(`Found ${res.rows.length} row(s):`);
  console.table(res.rows);
  await pool.end();
}
checkLLMCalls();