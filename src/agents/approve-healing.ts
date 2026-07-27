import { pool } from '../db/client';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const eventId = process.argv[2];

if (!eventId) {
  console.log('Usage: npx tsx src/agents/approve-healing.ts <healing_event_id>');
  process.exit(1);
}

async function approveHealing() {
  const { rows } = await pool.query(
    `SELECT he.*, tc.file_path
     FROM healing_events he
     JOIN test_cases tc ON tc.id = he.test_case_id
     WHERE he.id = $1`,
    [eventId]
  );

  const event = rows[0];
  if (!event) {
    console.log(`No healing_event found with id ${eventId}`);
    await pool.end();
    return;
  }

  if (!event.new_selector || !event.old_selector) {
    console.log('This event has no selector fix to apply (likely a non-selector failure, e.g. assertion_mismatch). Nothing to patch.');
    await pool.end();
    return;
  }

  const filePath = `tests-generated/${event.file_path}`;
  console.log(`Event ${eventId}: ${event.old_selector} -> ${event.new_selector}`);
  console.log(`Confidence: ${event.confidence}`);
  console.log(`Target file: ${filePath}`);

  const original = readFileSync(filePath, 'utf-8');
  if (!original.includes(event.old_selector)) {
    console.log(`old_selector not found in ${filePath} — may already be fixed or file changed. Aborting.`);
    await pool.end();
    return;
  }

  const patched = original.split(event.old_selector).join(event.new_selector);
  writeFileSync(filePath, patched);
  console.log('File patched. Re-running test to confirm...');

  try {
    execSync(`npx playwright test ${filePath}`, { stdio: 'inherit' });
    await pool.query('UPDATE healing_events SET approved = true WHERE id = $1', [eventId]);
    console.log(`\nTest passed. Marked healing_event ${eventId} as approved.`);
  } catch (err) {
    writeFileSync(filePath, original); // revert on failure
    console.log(`\nTest FAILED after patch. Reverted ${filePath} to original. NOT marking as approved.`);
  }

  await pool.end();
}

approveHealing();