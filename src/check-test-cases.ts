import { pool } from './db/client';

async function checkTestCases() {
  const result = await pool.query(
    `SELECT id, name, file_path, generated_by, created_at
     FROM test_cases
     ORDER BY id DESC
     LIMIT 5;`
  );

  console.log(`Found ${result.rows.length} row(s):\n`);
  console.table(result.rows);

  await pool.end();
}

checkTestCases().catch((err) => {
  console.error('Query failed:', err);
  process.exit(1);
});