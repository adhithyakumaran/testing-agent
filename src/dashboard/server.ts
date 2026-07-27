import 'dotenv/config';
import express from 'express';
import path from 'path';
import { pool } from '../db/client';

const app = express();
const PORT = process.env.DASHBOARD_PORT || 4000;

app.use(express.static(path.join(__dirname, 'public')));

function stripAnsi(text: string): string {
  return text ? text.replace(/\u001b\[[0-9;]*m/g, '') : text;
}

// --- API: Overview / pipeline stage counts ---
app.get('/api/overview', async (req, res) => {
  try {
    const totalRuns = await pool.query(`SELECT COUNT(*) FROM test_runs`);
    const passedRuns = await pool.query(`SELECT COUNT(*) FROM test_runs WHERE status = 'passed'`);
    const failedRuns = await pool.query(`SELECT COUNT(*) FROM test_runs WHERE status = 'failed'`);
    const totalCases = await pool.query(`SELECT COUNT(*) FROM test_cases`);
    const pendingHealing = await pool.query(`SELECT COUNT(*) FROM healing_events WHERE approved = false`);
    const approvedHealing = await pool.query(`SELECT COUNT(*) FROM healing_events WHERE approved = true`);
    const totalFailures = await pool.query(`SELECT COUNT(*) FROM failures`);

    res.json({
      totalRuns: parseInt(totalRuns.rows[0].count),
      passedRuns: parseInt(passedRuns.rows[0].count),
      failedRuns: parseInt(failedRuns.rows[0].count),
      totalCases: parseInt(totalCases.rows[0].count),
      pendingHealing: parseInt(pendingHealing.rows[0].count),
      approvedHealing: parseInt(approvedHealing.rows[0].count),
      totalFailures: parseInt(totalFailures.rows[0].count),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- API: Healing queue (pending + recent history) ---
app.get('/api/healing-events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT he.id, he.test_case_id, tc.name AS test_name, tc.file_path,
             he.old_selector, he.new_selector, he.confidence, he.reasoning,
             he.failure_category, he.classification_reasoning, he.approved, he.created_at
      FROM healing_events he
      LEFT JOIN test_cases tc ON tc.id = he.test_case_id
      ORDER BY he.created_at DESC
      LIMIT 50
    `);
    const cleaned = result.rows.map(row => ({
      ...row,
      reasoning: stripAnsi(row.reasoning),
      classification_reasoning: stripAnsi(row.classification_reasoning),
    }));
    res.json(cleaned);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- API: Recent failures with context ---
app.get('/api/failures', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.error_message, f.created_at,
             tr.status, tr.browser, tr.duration_ms,
             tc.name AS test_name, tc.file_path, tc.app_name
      FROM failures f
      JOIN test_runs tr ON tr.id = f.run_id
      LEFT JOIN test_cases tc ON tc.id = tr.test_case_id
      ORDER BY f.created_at DESC
      LIMIT 50
    `);
    const cleaned = result.rows.map(row => ({
      ...row,
      error_message: stripAnsi(row.error_message),
    }));
    res.json(cleaned);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- API: LLM cost/usage breakdown ---
app.get('/api/llm-usage', async (req, res) => {
  try {
    const byCaller = await pool.query(`
      SELECT caller,
             COUNT(*) AS call_count,
             SUM(input_tokens) AS total_input_tokens,
             SUM(output_tokens) AS total_output_tokens,
             SUM(CASE WHEN success = false THEN 1 ELSE 0 END) AS failure_count
      FROM llm_calls
      GROUP BY caller
      ORDER BY call_count DESC
    `);
    const recent = await pool.query(`
      SELECT id, provider, model, caller, input_tokens, output_tokens, success, error_message, created_at
      FROM llm_calls
      ORDER BY created_at DESC
      LIMIT 20
    `);
    const cleanedRecent = recent.rows.map(row => ({
      ...row,
      error_message: stripAnsi(row.error_message),
    }));
    res.json({ byCaller: byCaller.rows, recent: cleanedRecent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- API: Test cases with pass/fail summary ---
app.get('/api/test-cases', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tc.id, tc.name, tc.file_path, tc.generated_by, tc.app_name, tc.created_at,
             COUNT(tr.id) AS total_runs,
             SUM(CASE WHEN tr.status = 'passed' THEN 1 ELSE 0 END) AS passed_runs,
             SUM(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) AS failed_runs
      FROM test_cases tc
      LEFT JOIN test_runs tr ON tr.test_case_id = tc.id
      GROUP BY tc.id
      ORDER BY tc.created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
});