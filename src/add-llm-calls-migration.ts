import { pool } from './db/client';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS llm_calls (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  caller TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

async function runMigration() {
  console.log('Running migration: create llm_calls table...\n');
  try {
    await pool.query(MIGRATION_SQL);
    console.log('Migration applied successfully — llm_calls table created.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();