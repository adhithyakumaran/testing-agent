import { pool } from './db/client';

const MIGRATION_SQL = `
ALTER TABLE healing_events
  ALTER COLUMN old_selector DROP NOT NULL;

ALTER TABLE healing_events
  ADD COLUMN IF NOT EXISTS failure_category TEXT;

ALTER TABLE healing_events
  ADD COLUMN IF NOT EXISTS classification_reasoning TEXT;
`;

async function runMigration() {
  console.log('Running migration: add triage support to healing_events...\n');
  try {
    await pool.query(MIGRATION_SQL);
    console.log('Migration applied successfully.');
    console.log('  - old_selector is now nullable');
    console.log('  - added column: failure_category');
    console.log('  - added column: classification_reasoning');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();