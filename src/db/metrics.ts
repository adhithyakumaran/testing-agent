import { pool } from './client';

async function showMetrics() {
  const overall = await pool.query(`
    SELECT status, COUNT(*) as count
    FROM test_runs
    GROUP BY status
  `);

  const byTestCase = await pool.query(`
    SELECT tc.name, tc.generated_by, tc.file_path,
           COUNT(*) FILTER (WHERE tr.status = 'passed') as passed,
           COUNT(*) FILTER (WHERE tr.status = 'failed') as failed,
           ROUND(AVG(tr.duration_ms)) as avg_duration_ms
    FROM test_cases tc
    JOIN test_runs tr ON tr.test_case_id = tc.id
    GROUP BY tc.id, tc.name, tc.generated_by, tc.file_path
    ORDER BY tc.name
  `);

  console.log('=== Overall pass/fail ===');
  console.table(overall.rows);

  console.log('\n=== Per test case ===');
  console.table(byTestCase.rows);

  const total = overall.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
  const passed = overall.rows.find(r => r.status === 'passed')?.count || 0;
  const passRate = ((parseInt(passed) / total) * 100).toFixed(1);
  console.log(`\nOverall pass rate: ${passRate}% (${passed}/${total} runs)`);

  await pool.end();
}

showMetrics().catch(console.error);