import { pool } from './db/client';

async function checkHealingEvents() {
  const result = await pool.query(
    `SELECT id, test_case_id, old_selector, new_selector, confidence, approved
     FROM healing_events
     ORDER BY id DESC
     LIMIT 5;`
  );

  console.log(`Found ${result.rows.length} row(s):\n`);
  console.table(result.rows);

  await pool.end();
}

checkHealingEvents().catch((err) => {
  console.error('Query failed:', err);
  process.exit(1);
});