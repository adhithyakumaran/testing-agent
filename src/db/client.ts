import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testConnection() {
  const res = await pool.query('SELECT NOW()');
  return res.rows[0];
}