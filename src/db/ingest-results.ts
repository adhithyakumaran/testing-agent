import * as fs from 'fs';
import { pool } from './client';

interface PlaywrightResult {
  suites: any[];
}

async function ingest() {
  const raw = fs.readFileSync('test-results/results.json', 'utf-8');
  const data: PlaywrightResult = JSON.parse(raw);

  let insertedRuns = 0;

  async function insertRun(name: string, filePath: string, result: any, browser: string) {
    const existing = await pool.query(
      'SELECT id FROM test_cases WHERE name = $1 AND file_path = $2',
      [name, filePath]
    );

    let testCaseId: number;
    if (existing.rows.length > 0) {
      testCaseId = existing.rows[0].id;
    } else {
      const inserted = await pool.query(
        'INSERT INTO test_cases (name, file_path, generated_by) VALUES ($1, $2, $3) RETURNING id',
        [name, filePath, filePath.includes('ai-') ? 'ai:groq' : 'human']
      );
      testCaseId = inserted.rows[0].id;
    }

    const status = result.status === 'passed' ? 'passed' : 'failed';

    const runInsert = await pool.query(
      `INSERT INTO test_runs (test_case_id, status, duration_ms, started_at, finished_at, browser)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        testCaseId,
        status,
        result.duration,
        result.startTime,
        new Date(new Date(result.startTime).getTime() + result.duration).toISOString(),
        browser,
      ]
    );
    insertedRuns++;

    if (status === 'failed' && result.errors && result.errors.length > 0) {
      await pool.query(
        'INSERT INTO failures (run_id, error_message) VALUES ($1, $2)',
        [runInsert.rows[0].id, result.errors[0].message || JSON.stringify(result.errors[0])]
      );
    }
  }

  async function walkSuites(suites: any[], filePath = '') {
    for (const suite of suites) {
      const currentFile = suite.file || filePath;
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests) {
            for (const result of test.results) {
              await insertRun(spec.title, currentFile, result, test.projectName);
            }
          }
        }
      }
      if (suite.suites) {
        await walkSuites(suite.suites, currentFile);
      }
    }
  }

  await walkSuites(data.suites);
  console.log(`Ingested ${insertedRuns} test run records.`);
  await pool.end();
}

ingest().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});