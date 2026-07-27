import { pool } from './db/client';

const MIGRATION_SQL = `
ALTER TABLE test_cases
  ADD COLUMN IF NOT EXISTS app_name TEXT NOT NULL DEFAULT 'saucedemo';
`;

async function runMigration() {
  console.log('Running migration: add app_name to test_cases...\n');
  try {
    await pool.query(MIGRATION_SQL);
    console.log('Migration applied successfully.');
    console.log('  - added column: app_name (default "saucedemo" for existing rows)');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();