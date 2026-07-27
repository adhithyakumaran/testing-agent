import { pool } from './db/client';

(async () => {
  const runs = await pool.query('SELECT COUNT(*) FROM test_runs');
  const fails = await pool.query('SELECT COUNT(*) FROM failures');
  const cases = await pool.query('SELECT COUNT(*) FROM test_cases');
  const healing = await pool.query('SELECT COUNT(*) FROM healing_events');
  const llm = await pool.query('SELECT COUNT(*) FROM llm_calls');
  console.log('test_runs:', runs.rows[0].count);
  console.log('failures:', fails.rows[0].count);
  console.log('test_cases:', cases.rows[0].count);
  console.log('healing_events:', healing.rows[0].count);
  console.log('llm_calls:', llm.rows[0].count);
  await pool.end();
})();