import { pool } from './db/client';
import * as fs from 'fs';

(async () => {
  const sql = fs.readFileSync('src/db/schema.sql', 'utf-8');
  await pool.query(sql);
  console.log('Schema applied successfully to current DATABASE_URL target.');
  await pool.end();
})();